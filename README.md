# What is DebriefBot?

DebriefBot is a friendly helper for teaching teams, simplifying the daily end-of-day TA debriefs. By getting rid of needless copy-pasting and focusing data capture for note-takers, TAs can effectively debrief while Teachers can easily update the day's debrief with additional input later on.

[Demo Video (v1.0.0)](https://res.cloudinary.com/rahaluha/video/upload/v1601648452/DebriefBot_v1_vaz3sg.mp4)

# How does it work?

### Setting Up

DebriefBot has been added to the Le Wagon workspace so is available as a Bot that can be invited to any channel (via the `+👨‍💼` UI buttons or `/invite @DebriefBot`). In practice, DebriefBot should be invited to the private batch teacher channels (*#batch-476-teachers*) only. Once in the channel, the bot can be used as detailed below.

### Using DebriefBot

DebriefBot responds to the "slash command" `/debrief` with an optional parameter (see below). If you don't provide one, it will send you a message (that only you can see) giving you examples of parameters it accepts.

Currently there are 2 available parameters to provide when using `/debrief`:

- `/debrief`: To create a new debrief at the end of a teaching day, simple use `/debrief`.  Hit Enter/Send and a modal box will pop up with fields to fill in to complete the debrief.

These are plain text inputs so user and channel mentions do not work as of now. An exception is the students selector field, which allows you to select students from a list of all users in LW, with autocomplete.

Additionally, non-slack/unicode emojis (😁) and the plain-text format of Slack emojis (`:smile:` or `:drop_the_mic:`) will show up in the resulting debrief message correctly, but will not parse in real-time. Close your eyes and trust the process.

- `/debrief update`: Anyone (usually teachers, after the end-of-day live code) can then update the most recent debrief with this command, assuming not too much time has passed (at most 18h) since the original debrief was posted. This will pop up the same modal as before, with any existing comments or student usernames already filled in. After submitting, the original debrief is updated, along with its new timestamp and the username of whoever last updated it (you!).

### Alternative Responses

Any issues using the commands above are fed back to the user using ephemeral messages (i.e. messages only they can see). Here are all of the "error" messages:

- **"No recent (last 18h) debrief available. Please start a new one with "/debrief"**: You can't update a debrief if one hasn't been made in the last day! Create a new one instead with `/debrief`
- **"There's already a debrief for today, use "/debrief update" instead":** The opposite problem, there's already a debrief in the past 12h so you can only update it. Debriefs "expire" after 18h so you can create a new one after that much time has passed since it was first made.
- **"Not sure about that. Did you mean to use "/debrief update"?"**: You've made a typo when writing `update` (or have just typed gibberish after `/debrief` to see what it would do). Try again but make your friends proud this time.
- **"To start a new debrief, use "/debrief" or to update today's debrief use "/debrief update""**: The catch-all error message. You probably shouldn't ever see this message but you never know.

If you're fairly sure you shouldn't be seeing these error or a particular error, let me know at `@Rahul` on Slack or at [rahulkeerthi2@gmail.com](mailto:rahulkeerthi2@gmail.com). 

# Bot Default Settings

Some default settings are hardcoded into DebriefBot, specifically around timings for debrief age and relevance. 

### Timings

- **New Debriefs**: When trying to create a new debrief, the bot checks if one has been created in the **last 12 hours**. If there has been one, it responds with `There's already a debrief for today, use "/debrief update" instead`
- **Updating Debriefs**: When trying to update a debrief, the bot checks the conversation history in the **last 24 hours** to find the last debrief. If it cannot find one, it responds with `No recent (last 24h) debrief available. Please start a new one with "/debrief"`
- **Edge Cases:**
    - **Left Modal Open**: If the user started a debrief update but didn't submit it, if **more than 18 hours** has passed since the original debrief was posted, it responds with `Last Debrief is older than 18 hours. Please start a new one with /debrief` instead of allowing the update

### Response Size Limits

- Slack limits fetch requests to a maximum of **100** messages and channels per request (you can time-box these requests but not choose sort order) which means that issues may occur if a user is in more than 100 (unarchived) public channels, or there are more than 100 messages between debriefs. Slack allows a form of pagination (i.e. fetch next hundred results) if we issue an identical request but providing a "cursor" parameter that is found in the original request response

Accounting for these limits (particularly response size) and providing flexibility on setting timings (or uncoupling the requirement altogether) is part of the development roadmap for DebriefBot. See below for more details.

# Development Roadmap

## Core Functionality

- [ ]  Ensure DebriefBot can only be invited to (or at least, only be used in) private channels (i.e. teacher channels)
- [ ]  Better way to validate debrief "newness" than comparing message timestamp to arbitrary number of hours before "now"
- [ ]  Allow conversation history lookback or conversation list call to account for conversations with more than 100 messages between debriefs, or users who are in more than 100 unarchived public channels. Alternatively, implement an active_batch_channel and/or batch_debrief_messages data store for this lookup that is regularly run in the background (need to check infosec and GDPR issues).

## User Experience / Flow

- [x]  Provide permalink to existing debrief in ephemeral message when trying to create a new debrief within 12h of the previous one
- [x]  Make sure timestamp on debrief is in batch/channel timezone (use Slack [native time](https://api.slack.com/reference/surfaces/formatting#date-formatting))
- [ ]  "Live" display of user mentions and emojis in modal input boxes (only plain_text option available, which doesn't trigger a user/emoji lookup)
- [ ]  Ability to converse with DebriefBot (it responds via DMs) to get more information on how to use it and what the slash commands do

## Admin

- [ ]  Home app or specific slash command for batch owners to review debriefs from the past week for a particular channel (or channels)

Please raise an [Issue](https://github.com/rahulkeerthi/DebriefBot/issues) if you have suggestions or issues.
