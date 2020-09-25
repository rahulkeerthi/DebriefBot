async function fetchMessage(id, ts, app) {
	try {
		const result = await app.client.conversations.history({
			token: process.env.SLACK_BOT_TOKEN,
			channel: id,
			latest: ts,
			inclusive: true,
			limit: 1,
		})

		message = result.messages[0].blocks
		messageInitial = {
			generalFeelingInitial: message[4].text.text,
			lectureInitial: message[6].text.text,
			challengesInitial: message[8].text.text,
			studentsInitial: message[10].text.text,
			studentsByIdInitial: message[11].text.text,
			takeawaysInitial: message[13].text.text,
		}

		// messageInitial.generalFeelingInitial = message[4].text.text
		// messageInitial.lectureInitial = message[6].text.text
		// messageInitial.challengesInitial = message[8].text.text
		// messageInitial.studentsInitial = message[10].text.text
		// messageInitial.studentsByIdInitial = message[11].text.text
		// messageInitial.takeawaysInitial = message[13].text.text
		if (messageInitial.studentsByIdInitial != "No students tagged") {
			messageInitial.studentsByIdInitial = messageInitial.studentsByIdInitial.match(/<@[0-9A-Z]+>/g)
		}
		Object.keys(messageInitial).forEach(key => {
			if (messageInitial[key] == "No students tagged") {
				messageInitial[key] = ""
			} else if (messageInitial[key] == "No input provided") {
				messageInitial[key] = ""
			} else {
				return
			}
		})
		console.log(messageInitial)
	} catch (error) {
		console.error(error)
	}
}

export default fetchMessage
