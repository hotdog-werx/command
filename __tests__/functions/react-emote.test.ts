import {test, expect, vi} from 'vitest'
import {reactEmote} from '../../src/functions/react-emote'
import type {Context, Octokit} from '../../src/types/github'

const context = {
  repo: {
    owner: 'corp',
    repo: 'test'
  },
  payload: {
    comment: {
      id: '1'
    }
  }
} as unknown as Context

const createReactionMock = vi.fn().mockReturnValueOnce({
  data: {
    id: '1'
  }
})

const octokit = {
  rest: {
    reactions: {
      createForIssueComment: createReactionMock
    }
  }
} as unknown as Octokit

test('adds a reaction emote to a comment', async () => {
  expect(await reactEmote('eyes', context, octokit)).toStrictEqual({
    data: {id: '1'}
  })
})

test('returns if no reaction is specified', async () => {
  expect(await reactEmote('', context, octokit)).toBe(undefined)
  expect(await reactEmote(null as unknown as string, context, octokit)).toBe(
    undefined
  )
})

test('throws an error if a bad emote is used', async () => {
  try {
    await reactEmote('bad', context, octokit)
  } catch (e) {
    expect((e as Error).message).toBe('Reaction "bad" is not a valid preset')
  }
})