const { App } = require("@slack/bolt")
require("dotenv").config()

// Initializes your app with your bot token and signing secret
const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
})

async function fetchMessage(channel, user) {
	try {
		const result = await app.client.conversations.history({
			token: process.env.SLACK_BOT_TOKEN,
			channel: channel,
			oldest: (Date.now() - 24 * 60 * 60 * 1000) / 1000,
			inclusive: true,
			limit: 100,
		})

		if (result.messages.length == 0) {
			try {
				await app.client.chat.postEphemeral({
					token: process.env.SLACK_BOT_TOKEN,
					channel: channel,
					user: user,
					text: `No recent (last 24h) debrief available. Please start a new one with "/debrief #batch-123-city"`,
				})
			} catch (err) {
				console.error(err)
			}
		} else {
			let messages = result.messages.filter(message => {
				if (message.bot_profile) {
					return message.bot_profile.name == "DebriefBot"
				}
			})

			let message = messages[0].blocks
			msg = {
				generalFeelingInitial: message[4].text.text,
				lectureInitial: message[6].text.text,
				challengesInitial: message[8].text.text,
				studentsInitial: message[10].text.text,
				studentsByIdInitial: message[11].text.text,
				takeawaysInitial: message[13].text.text,
				ts: messages[0].ts,
			}

			if (msg.studentsByIdInitial != "No students tagged yet") {
				msg.studentsByIdInitial = msg.studentsByIdInitial.match(/[0-9A-Z]+/g)
			}
			Object.keys(msg).forEach(key => {
				if (msg[key] == "No students tagged yet") {
					msg[key] = ""
				} else if (msg[key] == "No input provided yet") {
					msg[key] = ""
				} else {
					return
				}
			})
			return msg
		}
	} catch (error) {
		console.error(error)
	}
}

app.command("/debrief", async ({ ack, body, client }) => {
	let messageInitial, debriefTs, isUpdate, targetChannel, targetChannelId

	if (body.text.trim() == "update") {
		await ack(`You're updating the debrief`)
		messageInitial = await fetchMessage(body.channel_id, body.user_id)
		debriefTs = messageInitial.ts
		console.log(`debriefTs: ${debriefTs}`)

		isUpdate = true
	} else if (body.text.trim()[0] == "#") {
		messageInitial = await fetchMessage(body.channel_id, body.user_id)
		if (messageInitial.ts > (Date.now() - 12 * 60 * 60 * 1000) / 1000) {
			await ack(`There's already a debrief for today, use "/debrief update" instead`)
			messageInitial = null
		} else {
			await ack(`You're starting today's debrief`)
			messageInitial = { generalFeelingInitial: "", lectureInitial: "", challengesInitial: "", studentsInitial: "", studentsByIdInitial: "", takeawaysInitial: "" }
			isUpdate = false
			targetChannel = body.text.trim().substring(1)
			try {
				const userChannels = await client.conversations.list({
					types: "public_channel",
					exclude_archived: true,
					token: process.env.SLACK_BOT_TOKEN,
				})
				console.log(`userChannels: ${userChannels}`)
				let targetChannelList = userChannels.channels.filter(channel => {
					return channel.name == targetChannel
				})
				if (targetChannelList.length > 0) {
					targetChannelId = targetChannelList[0].id
				}
			} catch (err) {
				console.error(err)
			}
		}
	} else {
		await ack(`To start a new debrief, use "/debrief #batch-123-xyz" or to update today's debrief use "/debrief update"`)
		messageInitial = null
	}

	try {
		metadata = JSON.stringify({
			channel: body.channel_id,
			debriefTs: debriefTs,
			isUpdate: isUpdate,
			user: body.user_id,
			targetChannelId: targetChannelId,
		})

		let introMessage
		if (targetChannel) {
			introMessage = `Let's get started with today's debrief${targetChannel == "" ? "!" : ` for <#${targetChannelId}>`}`
		} else {
			introMessage = `Let's update today's debrief!`
		}
		let blocks = [
			{
				type: "context",
				elements: [
					{
						type: "plain_text",
						text: `Fill in and submit the form during end-of-day debrief, leave fields blank as needed. Teachers can update responses later by using /debrief update`,
						emoji: true,
					},
				],
			},
			{
				type: "section",
				text: {
					type: "mrkdwn",
					text: `Hello, <@${body.user_id}>! ${introMessage}`,
				},
			},
			{
				type: "input",
				optional: true,
				block_id: "generalFeeling",
				element: {
					type: "plain_text_input",
					action_id: "generalFeelingInput",
					initial_value: messageInitial.generalFeelingInitial,
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
				optional: true,
				block_id: "lecture",
				element: {
					type: "plain_text_input",
					action_id: "lectureInput",
					initial_value: messageInitial.lectureInitial,
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
				optional: true,
				block_id: "challenges",
				element: {
					type: "plain_text_input",
					action_id: "challengesInput",
					initial_value: messageInitial.challengesInitial,
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
				optional: true,
				block_id: "students",
				element: {
					type: "plain_text_input",
					action_id: "studentsInput",
					initial_value: messageInitial.studentsInitial,
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
				optional: true,
				block_id: "studentsById",
				element: {
					type: "multi_users_select",
					action_id: "studentsByIdInput",
					initial_users: messageInitial.studentsByIdInitial || [],
					placeholder: {
						type: "plain_text",
						text: "Select students",
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
				optional: true,
				block_id: "takeaways",
				element: {
					type: "plain_text_input",
					action_id: "takeawaysInput",
					initial_value: messageInitial.takeawaysInitial,
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
		]

		if (messageInitial) {
			await client.views.open({
				trigger_id: body.trigger_id,

				view: {
					type: "modal",
					private_metadata: metadata,
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
					blocks: blocks,
				},
			})
		}
	} catch (error) {
		console.error(error)
	}
})

app.view("debriefModal", async ({ ack, view, context }) => {
	await ack()
	const values = view.state.values
	const { channel, debriefTs, isUpdate, user, targetChannelId } = JSON.parse(view.private_metadata)
	let generalFeeling = values.generalFeeling.generalFeelingInput.value || "No input provided yet"
	let lecture = values.lecture.lectureInput.value || "No input provided yet"
	let challenges = values.challenges.challengesInput.value || "No input provided yet"
	let students = values.students.studentsInput.value || "No input provided yet"
	let takeaways = values.takeaways.takeawaysInput.value || "No input provided yet"
	let studentsById = values.studentsById.studentsByIdInput.selected_users || []
	let studentsList = ""
	if (studentsById.length > 0) {
		studentsList = studentsById.map(studentId => `• <@${studentId}>\n`).join("")
	} else {
		studentsList = "No students tagged yet"
	}
	let options = { hour12: true }
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
				text: `Here's a summary of today's debrief (last updated: ${new Date().toLocaleString("en-GB", options)}):`,
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

	if (isUpdate && debriefTs < (Date.now() - 18 * 60 * 60 * 1000) / 1000) {
		try {
			await app.client.chat.postEphemeral({
				token: process.env.SLACK_BOT_TOKEN,
				channel: channel,
				user: user,
				text: `Last Debrief is older than 18 hours. Please start a new one with /debrief #batch-123-city`,
			})
		} catch (err) {
			console.error(err)
		}
	} else if (isUpdate) {
		try {
			await app.client.chat.update({
				token: context.botToken,
				channel: channel,
				blocks: responseToUser,
				ts: debriefTs,
			})
			await ack("All done!")
		} catch (error) {
			console.error(error)
		}
	} else {
		try {
			await app.client.chat.postMessage({
				token: context.botToken,
				channel: channel,
				blocks: responseToUser,
				text: "",
			})
			await ack("All done!")
		} catch (error) {
			console.error(error)
		}
	}
})
;(async () => {
	await app.start(process.env.PORT || 4390)
	console.log("⚡️ Bolt app is running!")
})()
