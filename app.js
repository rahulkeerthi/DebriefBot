const { App } = require("@slack/bolt")

// Initializes your app with your bot token and signing secret
const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
})

app.command("/debrief", async ({ ack, body, client }) => {
	await ack(`Rahul started a debrief`)
	// console.log(body.user_id, body.team_id)

	try {
		let targetChannel = ""
		if (body.text) {
			targetChannel = body.text.trim()
		}
		if (targetChannel[0] == "#") {
			targetChannel = targetChannel.substring(1)
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
								text: "Fill in and submit the form during end-of-day debrief, leave fields blank as needed. Teachers can update responses later by using /debrief",
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

app.view("debriefModal", async ({ ack, body, view, context }) => {
	await ack("Debrief completed!")
	// console.log(context)
	let generalFeeling, lecture, challenges, students, studentsById, takeaways, nextTeacher, responseToUser, userId
	userId = view["user"]["id"]
	generalFeeling = view["state"]["values"]["generalFeeling"]["value"]
	lecture = view["state"]["values"]["lecture"]["value"]
	challenges = view["state"]["values"]["challenges"]["value"]
	students = view["state"]["values"]["students"]["value"]
	takeaways = view["state"]["values"]["takeaways"]["value"]
	nextTeacher = view["state"]["values"]["nextTeacher"]["value"]
	studentsById = view["state"]["values"]["studentsById"]["selected_users"]
	console.log(generalFeeling, lecture, challenges, students, studentsById, takeaways, nextTeacher, responseToUser, userId)
	if (generalFeeling) {
		responseToUser = "Thanks for debriefing!"
	} else {
		responseToUser = "There was an error, please try again!"
	}

	try {
		await app.client.chat.postMessage({
			token: process.env.SLACK_BOT_TOKEN,
			channel: view["team"]["id"],
			text: responseToUser,
		})
	} catch (error) {
		console.error(error)
	}
})
;(async () => {
	// Start your app
	await app.start(process.env.PORT || 4390)
	console.log("⚡️ Bolt app is running!")
})()
