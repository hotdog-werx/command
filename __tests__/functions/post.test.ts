import {test, expect, beforeEach, vi} from 'vitest'
import {post} from '../../src/functions/post'
import * as core from '@actions/core'
import * as github from '@actions/github'
import * as contextCheck from '../../src/functions/context-check'
import * as postReactions from '../../src/functions/post-reactions'

vi.mock('@actions/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/core')>()
  return {
    ...actual,
    setFailed: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    getBooleanInput: vi.fn(),
    getInput: vi.fn(),
    getState: vi.fn()
  }
})

vi.mock('@actions/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/github')>()
  return {
    ...actual,
    getOctokit: vi.fn()
  }
})

vi.mock('../../src/functions/context-check', () => ({
  contextCheck: vi.fn()
}))

vi.mock('../../src/functions/post-reactions', () => ({
  postReactions: vi.fn()
}))

// input/state tables consulted by the mocked core input functions
const validBooleanInputs: Record<string, any> = {
  skip_completing: false
}
const validInputs: Record<string, any> = {
  status: 'success'
}

const validStates: Record<string, any> = {
  comment_id: '123',
  token: 'test-token'
}

const setFailedMock = vi.mocked(core.setFailed).mockImplementation(() => {})
const setWarningMock = vi.mocked(core.warning).mockImplementation(() => {})
const infoMock = vi.mocked(core.info).mockImplementation(() => {})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(core.error).mockImplementation(() => {})
  vi.mocked(core.debug).mockImplementation(() => {})
  vi.mocked(core.getBooleanInput).mockImplementation((name: string) => {
    return validBooleanInputs[name]
  })
  vi.mocked(core.getInput).mockImplementation((name: string) => {
    return validInputs[name]
  })
  vi.mocked(core.getState).mockImplementation((name: string) => {
    return validStates[name]
  })
  vi.mocked(contextCheck.contextCheck).mockImplementation(async () => {
    return {valid: true, context: 'pull_request'}
  })

  vi.mocked(postReactions.postReactions).mockImplementation(
    async () => true as unknown as void
  )

  // spy and return a mock octokit object with methods
  vi.mocked(github.getOctokit).mockImplementation(
    () => true as unknown as ReturnType<typeof github.getOctokit>
  )
})

test('successfully runs post() Action logic', async () => {
  expect(await post()).toBeUndefined()
})

test('successfully runs post() Action logic when "success" is false', async () => {
  validInputs.status = 'failure'
  expect(await post()).toBeUndefined()
})

test('exits due to an invalid Actions context', async () => {
  vi.mocked(contextCheck.contextCheck).mockImplementation(async () => {
    return {valid: false, context: 'pull_request'}
  })
  expect(await post()).toBeUndefined()
})

test('exits due to a bypass being set', async () => {
  const bypassed: Record<string, any> = {
    bypass: 'true'
  }
  vi.mocked(core.getState).mockImplementation((name: string) => {
    return bypassed[name]
  })
  expect(await post()).toBeUndefined()
  expect(setWarningMock).toHaveBeenCalledWith('bypass set, exiting')
})

test('skips the process of completing the run', async () => {
  const skipped: Record<string, any> = {
    skip_completing: 'true'
  }
  vi.mocked(core.getBooleanInput).mockImplementation((name: string) => {
    return skipped[name]
  })
  expect(await post()).toBeUndefined()
  expect(infoMock).toHaveBeenCalledWith('⏩ skip_completing set, exiting')
})

test('throws an error', async () => {
  try {
    vi.mocked(github.getOctokit).mockImplementation(() => {
      throw new Error('test error')
    })
    await post()
  } catch (e) {
    expect((e as Error).message).toBe('test error')
    expect(setFailedMock).toHaveBeenCalledWith('test error')
  }
})

test('use reaction specified in input on success', async () => {
  const reactionInput: Record<string, any> = {
    status: 'success',
    success_reaction: 'rocket'
  }
  vi.mocked(core.getInput).mockImplementation((name: string) => {
    return reactionInput[name]
  })
  const postReactionsMock = vi.mocked(postReactions.postReactions)

  expect(await post()).toBeUndefined()
  expect(postReactionsMock).toHaveBeenCalled()
  expect(postReactionsMock.mock.calls[0][2]).toBe('rocket')
})

test('use reaction specified in input on failure', async () => {
  const reactionInput: Record<string, any> = {
    status: 'failure',
    failure_reaction: 'confused'
  }
  vi.mocked(core.getInput).mockImplementation((name: string) => {
    return reactionInput[name]
  })
  const postReactionsMock = vi.mocked(postReactions.postReactions)

  expect(await post()).toBeUndefined()
  expect(postReactionsMock).toHaveBeenCalled()
  expect(postReactionsMock.mock.calls[0][2]).toBe('confused')
})