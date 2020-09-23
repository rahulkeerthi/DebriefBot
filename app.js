const { App } = require("@slack/bolt")

// Initializes your app with your bot token and signing secret
const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
})

app.command("/debrief", async ({ ack, body, client }) => {
	await ack(`<@${body.user_id}> started a debrief`)
	try {
		let targetChannel = ""
		if (body.text) {
			targetChannel = body.text.trim()
		}
		if (targetChannel[0] == "#") {
			targetChannel = targetChannel.trim().substring(1)
		}

		// Call chat.scheduleMessage with the built-in client
		const userChannels = await client.conversations.list({
			types: "public_channel",
			exclude_archived: true,
			token: process.env.SLACK_BOT_TOKEN,
		})
		// console.log(targetChannel)
		let targetChannelList = userChannels.channels.filter(channel => {
			return channel.name == targetChannel
		})
		let targetChannelId
		if (targetChannelList.length > 0) {
			targetChannelId = targetChannelList[0].id
		}
		const result = await client.views.open({
			trigger_id: body.trigger_id,

			view: {
				type: "modal",
				private_metadata: body.channel_id,
				callback_id: "debriefModal",
				title: {
					type: "plain_text",
					text: "Let's Debrief! 🚀",
					emoji: true,
				},
				submit: {
					type: "plain_text",
					text: "Submit",
					emoji: true,
				},
				close: {
					type: "plain_text",
					text: "Cancel",
					emoji: true,
				},
				blocks: [
					{
						type: "context",
						elements: [
							{
								type: "plain_text",
								text: `Fill in and submit the form during end-of-day debrief, leave fields blank as needed. Teachers can update responses later by using /debrief #${targetChannelId}`,
								emoji: true,
							},
						],
					},
					{
						type: "section",
						text: {
							type: "mrkdwn",
							text: `Hello, <@${body.user_id}>! Let's get started with today's debrief${targetChannel == "" ? "!" : ` for <#${targetChannelId}>`}`,
						},
					},
					{
						type: "input",
						block_id: "generalFeeling",
						element: {
							type: "plain_text_input",
							action_id: "generalFeelingInput",
							placeholder: {
								type: "plain_text",
								text: "How are the students doing in terms of general engagement, productivity, and enthusiasm? Any specifics to celebrate or mark as a concern?",
							},
							multiline: true,
						},
						label: {
							type: "plain_text",
							text: "General feeling about the batch:",
							emoji: true,
						},
					},
					{
						type: "input",
						block_id: "lecture",
						element: {
							type: "plain_text_input",
							action_id: "lectureInput",
							placeholder: {
								type: "plain_text",
								text: "How did the lecture and livecode go in terms of conduct, engagement and understanding? Any areas for reinforcement or attention in the future?",
							},
							multiline: true,
						},
						label: {
							type: "plain_text",
							text: "Lectures:",
							emoji: true,
						},
					},
					{
						type: "input",
						block_id: "challenges",
						element: {
							type: "plain_text_input",
							action_id: "challengesInput",
							placeholder: {
								type: "plain_text",
								text: "What recurring issues and tickets were students having today? Are there any potential issues or areas of improvement for the challenges of the day?",
							},
							multiline: true,
						},
						label: {
							type: "plain_text",
							text: "Challenges and Tickets:",
							emoji: true,
						},
					},
					{
						type: "input",
						block_id: "students",
						element: {
							type: "plain_text_input",
							action_id: "studentsInput",
							placeholder: {
								type: "plain_text",
								text: "Which students are struggling and need additional attention? Any unusual absences or behaviour? Any follow-up activity required for the next session?",
							},
							multiline: true,
						},
						label: {
							type: "plain_text",
							text: "Students:",
							emoji: true,
						},
					},
					{
						type: "input",
						block_id: "studentsById",
						element: {
							type: "multi_users_select",
							action_id: "studentsByIdInput",
							placeholder: {
								type: "plain_text",
								text: "Select users",
								emoji: true,
							},
						},
						label: {
							type: "plain_text",
							text: "Students to Monitor:",
							emoji: true,
						},
					},
					{
						type: "input",
						block_id: "takeaways",
						element: {
							type: "plain_text_input",
							action_id: "takeawaysInput",
							placeholder: {
								type: "plain_text",
								text: "What can improve today's lesson for future batches? What lessons learned are there for the team? What suggestions can we make for the next session?",
							},
							multiline: true,
						},
						label: {
							type: "plain_text",
							text: "General takeaways:",
							emoji: true,
						},
					},
					// {
					// 	type: "section",
					// 	block_id: "nextTeacher",
					// 	text: {
					// 		type: "mrkdwn",
					// 		text: "Next session's teacher",
					// 	},
					// 	accessory: {
					// 		type: "users_select",
					// 		placeholder: {
					// 			type: "plain_text",
					// 			text: "Select a user",
					// 			emoji: true,
					// 		},
					// 	},
					// },
				],
			},
		})
	} catch (error) {
		console.error(error)
	}
})

app.view("debriefModal", async ({ ack, view, context }) => {
	await ack()
	const values = view.state.values
	let targetConversation = view.private_metadata
	let generalFeeling = values.generalFeeling.generalFeelingInput.value
	let lecture = values.lecture.lectureInput.value
	let challenges = values.challenges.challengesInput.value
	let students = values.students.studentsInput.value
	let takeaways = values.takeaways.takeawaysInput.value
	// nextTeacher = values.["nextTeacher"]["value"]
	let studentsById = values.studentsById.studentsByIdInput.selected_users
	studentsList = studentsById.map(studentId => `• <@${studentId}>\n`).join("")

	let responseToUser = [
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "Hi Team :wave:",
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "Here's a summary of today's debrief:",
			},
		},
		{
			type: "divider",
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: ":rocket: *General feeling about the batch*",
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: generalFeeling,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: ":microphone: :livecode: *Lectures and Livecode*",
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: lecture,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: ":thinking: *Challenges and Tickets*",
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: challenges,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: ":male-student: :female-student: *Students*",
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: students,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: studentsList,
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: ":takeout_box: *General takeaways*",
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: takeaways,
			},
		},
	]
	responseToUser = JSON.stringify(responseToUser)
	try {
		await app.client.chat.postMessage({
			token: context.botToken,
			channel: targetConversation,
			text: "",
			blocks: responseToUser,
		})
	} catch (error) {
		console.error(error)
	}
})
;(async () => {
	await app.start(process.env.PORT || 4390)
	console.log("⚡️ Bolt app is running!")
})()
