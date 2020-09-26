async function fetchMessage(channel, user) {
	try {
		const result = await app.client.conversations.history({
			token: process.env.SLACK_BOT_TOKEN,
			channel: channel,
			latest: Date.now() - 24 * 60 * 60 * 1000,
			inclusive: true,
			limit: 1,
		})

		if (result.messages.length == 0) {
			try {
				await app.client.chat.postEphemeral({
					token: process.env.SLACK_BOT_TOKEN,
					channel: channel,
					user: user,
					text: `No recent debrief available. Please start a new one with /debrief`,
				})
			} catch (err) {
				console.error(err)
			}
			return false
		} else {
			let messages = result.messages.filter(message => {
				if (message.bot_profile) {
					return message.bot_profile.name == "DebriefBot"
				} else {
					return false
				}
			})

			async function replaceUserMentions(string) {
				const usersArray = string.match(/[0-9A-Z]+/g)
				if (usersArray.length > 0) {
					await usersArray.forEach(user => {
						const response = app.client.users.profile.get({
							token: process.env.SLACK_BOT_TOKEN,
							user: user,
						})
						return string.replace(/[0-9A-Z]+/g, `<${response.profile.display_name}`)
					})
				}
				console.log(string)
				return string
			}

			let message = messages[0].blocks
			msg = {
				generalFeelingInitial: message[4].text.text,
				lectureInitial: message[6].text.text,
				challengesInitial: message[8].text.text,
				studentsInitial: message[10].text.text,
				studentsByIdInitial: message[11].text.text,
				takeawaysInitial: message[13].text.text,
			}

			if (msg.studentsByIdInitial != "No students tagged") {
				msg.studentsByIdInitial = msg.studentsByIdInitial.match(/[0-9A-Z]+/g)
			}
			Object.keys(msg).forEach(key => {
				if (msg[key] == "No students tagged") {
					msg[key] = ""
				} else if (msg[key] == "No input provided") {
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

export default fetchMessage
