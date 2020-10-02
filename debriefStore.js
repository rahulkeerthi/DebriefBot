// const app = new App({
// 	token: process.env.SLACK_BOT_TOKEN,
// 	signingSecret: process.env.SLACK_SIGNING_SECRET,
// 	debriefStore: new debriefStore(),
// })

class debriefStore {
	set(debriefId, value, expiresAt) {
		return db()
			.ref("debriefs/" + debriefId)
			.set({ value, expiresAt })
	}
	get(debriefId) {
		return new Promise((resolve, reject) => {
			db()
				.ref("debriefs/" + debriefId)
				.once("value")
				.then(result => {
					if (result !== undefined) {
						if (result.expiresAt !== undefined && Date.now() > result.expiresAt) {
							db()
								.ref("debriefs/" + debriefId)
								.delete()
							reject(new Error("Debrief expired"))
						}
						resolve(result.value)
					} else {
						reject(new Error("Debrief not found"))
					}
				})
		})
	}
}
