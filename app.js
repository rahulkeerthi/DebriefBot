const { App, LogLevel } = require("@slack/bolt")
require("dotenv").config()

let slackBotToken = process.env.NODE_ENV === "dev" ? process.env.SLACK_BOT_TOKEN_DEV : process.env.SLACK_BOT_TOKEN
let slackSigningSecret = process.env.NODE_ENV === "dev" ? process.env.SLACK_SIGNING_SECRET_DEV : process.env.SLACK_SIGNING_SECRET
// Initializes your app with your bot token and signing secret
const app = new App({
	token: slackBotToken,
	signingSecret: slackSigningSecret,
	logLevel: LogLevel.DEBUG,
})

// fetches the last debrief from the current channel
async function fetchMessage(channel) {
	try {
		// fetch last 100 messages from channel
		const result = await app.client.conversations.history({
			token: slackBotToken,
			channel: channel,
			oldest: (Date.now() - 23 * 60 * 60 * 1000) / 1000,
			inclusive: true,
			limit: 100,
		})

		// filters messages sent by DebriefBot
		let messages = result.messages.filter(message => {
			if (message.bot_profile && message.blocks) {
				return message.bot_profile.name == "DebriefBot"
			}
		})

		// if messages are found, construct the msg object
		if (messages.length > 0) {
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

			// capture user mentions formatted as bullet points
			if (msg.studentsByIdInitial != "No students tagged yet") {
				msg.studentsByIdInitial = msg.studentsByIdInitial.match(/[0-9A-Z]+/g)
			}

			// replace default no-input strings with blanks
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
		} else {
			return null
		}
	} catch (error) {
		console.error(error)
	}
}

// listens for and responds to /debrief slash command
app.command("/debrief", async ({ ack, body, client }) => {
	let debriefTs
	let isUpdate = false
	// fetch any previous debrief if available
	let messageInitial = await fetchMessage(body.channel_id)

	// decide what to do based on slash command instructions and timestamp of debrief
	if (body.text.trim() == "update" && messageInitial && messageInitial.ts < (Date.now() - 18 * 60 * 60 * 1000) / 1000) {
		await ack(`No recent (last 18h) debrief available. Please start a new one with "/debrief`)
	} else if (body.text.trim() == "update" && messageInitial) {
		await ack(`You're updating the debrief`)
		debriefTs = messageInitial.ts
		isUpdate = true
	} else if (body.text.trim() == "update" && !messageInitial) {
		await ack(`No recent (last 18h) debrief available. Please start a new one with "/debrief`)
	} else if (body.text && body.text.trim() !== "update") {
		await ack(`Not sure about that. Did you mean to use "/debrief update"?`)
		messageInitial = null
	} else if (messageInitial && messageInitial.ts > (Date.now() - 12 * 60 * 60 * 1000) / 1000) {
		await ack(`There's already a debrief for today, use "/debrief update" instead`)
		messageInitial = null
	} else if (!messageInitial) {
		await ack(`You're starting today's debrief`)
		messageInitial = { generalFeelingInitial: "", lectureInitial: "", challengesInitial: "", studentsInitial: "", studentsByIdInitial: "", takeawaysInitial: "" }
	} else {
		await ack(`To start a new debrief, use "/debrief" or to update today's debrief use "/debrief update"`)
	}

	try {
		if (messageInitial) {
			metadata = JSON.stringify({
				channel: body.channel_id,
				debriefTs: debriefTs,
				isUpdate: isUpdate,
				user: body.user_id,
			})

			let introMessage
			isUpdate ? (introMessage = `Let's update today's debrief!`) : (introMessage = `Let's get started with today's debrief!`)
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
							text: "Note any tensions or the general mood of the batch",
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
							text: "How did you feel about them? How about your students' engagement and understanding?",
						},
						multiline: true,
					},
					label: {
						type: "plain_text",
						text: "Lecture & Livecode:",
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
							text: "Queue monitoring, recurring themes and/or difficulties",
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
							text: "Spotting edge cases: really struggling, not following Le Wagon learning spirit (e.g. leaving buddy behind, isolating oneself, or refusing any help)",
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
							text: "What actionable advice do you have for next day's staff? (e.g. reiterate to create tickets if students are stuck for more than 15 minutes)",
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

app.view("debriefModal", async ({ ack, view }) => {
	await ack()
	const values = view.state.values
	const { channel, debriefTs, isUpdate, user } = JSON.parse(view.private_metadata)
	// prepare block data for a posted message using either existing values or default text if left blank
	let generalFeeling = values.generalFeeling.generalFeelingInput.value || "No input provided yet"
	let lecture = values.lecture.lectureInput.value || "No input provided yet"
	let challenges = values.challenges.challengesInput.value || "No input provided yet"
	let students = values.students.studentsInput.value || "No input provided yet"
	let takeaways = values.takeaways.takeawaysInput.value || "No input provided yet"
	let studentsById = values.studentsById.studentsByIdInput.selected_users || []
	let studentsList = ""
	if (studentsById.length > 0) {
		// construct unordered list of students using user mention formatting
		studentsList = studentsById.map(studentId => `• <@${studentId}>\n`).join("")
	} else {
		studentsList = "No students tagged yet"
	}
	// construct stringified blocks to post as debrief message
	let responseToUser = JSON.stringify([
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
				text: `Here's a summary of today's debrief (last updated: <!date^${Math.round(new Date() / 1000)}^{date_short_pretty} {time}|${new Date().toLocaleString("en-GB", { hour12: true })} UTC> by <@${user}>):`,
			},
		},
		{
			type: "divider",
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "*General Feeling About the Batch* :rocket:",
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
				text: "*Lectures and Livecode* :microphone: :livecode:",
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
				text: "*Challenges and Tickets* :thinking:",
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
				text: "*Students* :male-student: :female-student:",
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
				text: "*General takeaways* :takeout_box:",
			},
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: takeaways,
			},
		},
		{
			type: "divider",
		},
		{
			type: "section",
			text: {
				type: "mrkdwn",
				text: "*That's it! Have a lovely day! DebriefBot over and out!* :drop_the_mic:",
			},
		},
	])

	if (isUpdate && debriefTs < (Date.now() - 18 * 60 * 60 * 1000) / 1000) {
		try {
			// if for some reason modal was left open for a long time before submitting, prevent update
			await app.client.chat.postEphemeral({
				token: slackBotToken,
				channel: channel,
				user: user,
				text: `Last debrief is older than 18 hours. Please start a new one with /debrief`,
			})
		} catch (err) {
			console.error(err)
		}
		// check if this is an update or not to choose the right action (chat.update vs chat.postMessage)
	} else if (isUpdate) {
		try {
			await app.client.chat.update({
				token: slackBotToken,
				channel: channel,
				blocks: responseToUser,
				ts: debriefTs,
				as_user: true,
			})
			const getPermalinkResponse = await app.client.chat.getPermalink({
				token: slackBotToken,
				channel: channel,
				message_ts: debriefTs,
			})
			await app.client.chat.postMessage({
				token: slackBotToken,
				channel: channel,
				text: `Today's debrief has been updated! You can see it <${getPermalinkResponse.permalink}|*here*>`,
			})
		} catch (error) {
			console.error(error)
		}
	} else {
		try {
			await app.client.chat.postEphemeral({
				token: slackBotToken,
				channel: channel,
				user: user,
				text: `Today's debrief is on its way! :star-struck:`,
			})
			await app.client.chat.postMessage({
				token: slackBotToken,
				channel: channel,
				blocks: responseToUser,
				text: "",
				link_name: true,
			})
		} catch (error) {
			console.error(error)
		}
	}
})

let app_home_basic_block = {}

app.event("app_home_opened", async ({ event, client }) => {
	app_home_basic_block = JSON.stringify({
		type: "home",
		blocks: [
			{
				type: "header",
				text: {
					type: "plain_text",
					text: "Welcome to DebriefBot! Here, you can explore the debriefs of any batch you are a part of. Just enter a batch number below!",
					emoji: true,
				},
			},
			{
				type: "section",
				block_id: "batch_select",
				text: {
					type: "mrkdwn",
					text: "Select batch(es) you'd like to see debriefs from",
				},
				accessory: {
					type: "multi_conversations_select",
					placeholder: {
						type: "plain_text",
						text: "Select conversations",
						emoji: true,
					},
					action_id: "batch_selection",
				},
			},
		],
		callback_id: "home",
		private_metadata: event.user_id,
	})
	try {
		await client.views.publish({
			user_id: event.user,
			view: app_home_basic_block,
			token: slackBotToken,
		})
	} catch (error) {
		console.error(error)
	}
})

app.action("batch_selection", async ({ ack, payload, body, client }) => {
	await ack()
	console.log("PAYLOAD")
	console.log(payload)
	console.log("BODY")
	console.log(body)
	app_home_basic_block = JSON.stringify({
		type: "home",
		blocks: [
			{
				type: "header",
				text: {
					type: "plain_text",
					text: "Welcome to DebriefBot! Here, you can explore the debriefs of any batch you are a part of. Just select a batch number below!",
					emoji: true,
				},
			},
			{
				type: "section",
				block_id: "batch_select",
				text: {
					type: "mrkdwn",
					text: "Please select the corresponding teacher batch, not the student one!",
				},
				accessory: {
					type: "multi_conversations_select",
					placeholder: {
						type: "plain_text",
						text: "Select conversations",
						emoji: true,
					},
					action_id: "batch_selection",
				},
			},
			{
				type: "header",
				text: {
					type: "plain_text",
					text: `You've chosen <#${payload.selected_conversations[0]}>!`,
					emoji: true,
				},
			},
		],
		callback_id: "home",
	})

	try {
		const result = await client.views.publish({
			token: slackBotToken,
			user_id: body.user.id,
			view: app_home_basic_block,
		})
		console.log("RESULT")
		console.log(result)
	} catch (error) {
		console.error(error)
	}
})
;(async () => {
	await app.start(process.env.PORT || 4390)
	console.log("⚡️ Bolt app is running!")
})()
