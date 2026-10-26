import type {Context, Octokit} from '../types/github'

// Default failure reaction
const thumbsDown = '-1'
// Default success reaction
const rocket = 'rocket'
// Alt success reaction
const thumbsUp = '+1'

// Helper function to add a status update for the action that is running an IssueOps command
// It also updates the original comment with a reaction depending on the status of the operation
// :param context: The context of the action
// :param octokit: The octokit object
// :param reactionId: The id of the original reaction added to our trigger comment (Integer)
// :param message: The message to be added to the action status (String)
// :param success: Boolean indicating whether the operation was successful (Boolean)
// :param altSuccessReaction: Boolean indicating whether to use the alternate success reaction (Boolean)
// :returns: Nothing
export async function actionStatus(
  context: Context,
  octokit: Octokit,
  reactionId: number,
  message?: string,
  success?: boolean,
  altSuccessReaction?: boolean
): Promise<void> {
  // check if message is null or empty
  if (!message || message.length === 0) {
    const log_url = `${process.env.GITHUB_SERVER_URL}/${context.repo.owner}/${context.repo.repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
    message = 'Unknown error, [check logs](' + log_url + ') for more details.'
  }

  // add a comment to the issue with the message
  await octokit.rest.issues.createComment({
    ...context.repo,
    issue_number: context.issue.number,
    body: message
  })

  // Select the reaction to add to the issue_comment
  let reaction: typeof thumbsDown | typeof rocket | typeof thumbsUp
  if (success) {
    if (altSuccessReaction) {
      reaction = thumbsUp
    } else {
      reaction = rocket
    }
  } else {
    reaction = thumbsDown
  }

  // add a reaction to the issue_comment to indicate success or failure
  await octokit.rest.reactions.createForIssueComment({
    ...context.repo,
    comment_id: context.payload.comment!.id,
    content: reaction
  })

  // remove the initial reaction on the IssueOp comment that triggered this action
  await octokit.rest.reactions.deleteForIssueComment({
    ...context.repo,
    comment_id: context.payload.comment!.id,
    reaction_id: reactionId
  })
}