import {test, expect, beforeEach, vi} from 'vitest'
import {postReactions} from '../../src/functions/post-reactions'

// hand-rolled fakes, rebuilt per test
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let context: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let octokit: any

beforeEach(() => {
  vi.clearAllMocks()

  context = {
    repo: {
      owner: 'corp',
      repo: 'test'
    },
    payload: {
      comment: {
        id: '1'
      }
    }
  }

  octokit = {
    rest: {
      reactions: {
        createForIssueComment: vi.fn().mockReturnValueOnce({
          data: {}
        }),
        deleteForIssueComment: vi.fn().mockReturnValueOnce({
          data: {}
        })
      }
    }
  }
})

test('adds a successful reaction', async () => {
  expect(await postReactions(octokit, context, '+1', '123')).toBe(undefined)
  expect(octokit.rest.reactions.createForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    content: '+1',
    owner: 'corp',
    repo: 'test'
  })
  expect(octokit.rest.reactions.deleteForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    owner: 'corp',
    reaction_id: 123,
    repo: 'test'
  })
})

test('adds a failure reaction', async () => {
  expect(await postReactions(octokit, context, '-1', '123')).toBe(undefined)
  expect(octokit.rest.reactions.createForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    content: '-1',
    owner: 'corp',
    repo: 'test'
  })
  expect(octokit.rest.reactions.deleteForIssueComment).toHaveBeenCalledWith({
    comment_id: '1',
    owner: 'corp',
    reaction_id: 123,
    repo: 'test'
  })
})