import {test, expect, beforeEach, vi} from 'vitest'
import {run} from '../src/main'
import * as reactEmote from '../src/functions/react-emote'
import * as contextCheck from '../src/functions/context-check'
import * as prechecks from '../src/functions/prechecks'
import * as actionStatus from '../src/functions/action-status'
import * as github from '@actions/github'
import * as core from '@actions/core'

vi.mock('@actions/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/core')>()
  return {
    ...actual,
    setOutput: vi.fn(),
    setFailed: vi.fn(),
    saveState: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  }
})

vi.mock('@actions/github', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/github')>()
  return {
    ...actual,
    getOctokit: vi.fn()
  }
})

vi.mock('../src/functions/context-check', () => ({
  contextCheck: vi.fn()
}))

vi.mock('../src/functions/react-emote', () => ({
  reactEmote: vi.fn()
}))

vi.mock('../src/functions/prechecks', () => ({
  prechecks: vi.fn()
}))

vi.mock('../src/functions/action-status', () => ({
  actionStatus: vi.fn()
}))

const setOutputMock = vi.mocked(core.setOutput)
const saveStateMock = vi.mocked(core.saveState)
const setFailedMock = vi.mocked(core.setFailed)
const infoMock = vi.mocked(core.info)
// const debugMock = vi.mocked(core.debug)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(core.setOutput).mockImplementation(() => {})
  vi.mocked(core.setFailed).mockImplementation(() => {})
  vi.mocked(core.saveState).mockImplementation(() => {})
  vi.mocked(core.info).mockImplementation(() => {})
  vi.mocked(core.debug).mockImplementation(() => {})
  vi.mocked(core.warning).mockImplementation(() => {})
  vi.mocked(core.error).mockImplementation(() => {})
  process.env.INPUT_GITHUB_TOKEN = 'faketoken'
  process.env.INPUT_COMMAND = '.test'
  process.env.INPUT_REACTION = 'eyes'
  process.env.INPUT_PARAM_SEPARATOR = '|'
  process.env.INPUT_ALLOW_FORKS = 'false'
  process.env.INPUT_SKIP_CI = 'false'
  process.env.INPUT_ALLOW_DRAFTS = 'false'
  process.env.INPUT_SKIP_REVIEWS = 'false'
  process.env.INPUT_FORK_REVIEW_BYPASS = 'false'
  github.context.payload = {
    issue: {
      number: 123
    },
    comment: {
      body: '.test',
      id: 123,
      user: {
        login: 'monalisa'
      }
    }
  }

  vi.mocked(github.getOctokit).mockImplementation(() => {
    return {
      rest: {
        issues: {
          createComment: vi.fn().mockReturnValueOnce({
            data: {}
          })
        },
        pulls: {
          get: vi.fn().mockImplementation(() => {
            return {data: {head: {ref: 'test-ref'}}, status: 200}
          })
        }
      }
    } as never
  })
  vi.mocked(contextCheck.contextCheck).mockImplementation(async () => {
    return {valid: true, context: 'pull_request'}
  })
  vi.mocked(reactEmote.reactEmote).mockImplementation(() => {
    return {data: {id: '123'}} as never
  })
  vi.mocked(prechecks.prechecks).mockImplementation(() => {
    return {
      ref: 'test-ref',
      status: true,
      message: '✔️ PR is approved and all CI checks passed - OK',
      noopMode: false
    } as never
  })
})

test('successfully runs the action', async () => {
  expect(await run()).toBe('success')
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', '.test')
  expect(setOutputMock).toHaveBeenCalledWith('triggered', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('comment_id', 123)
  expect(setOutputMock).toHaveBeenCalledWith('ref', 'test-ref')
  expect(setOutputMock).toHaveBeenCalledWith('continue', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('params', '')
  expect(saveStateMock).toHaveBeenCalledWith('isPost', 'true')
  expect(saveStateMock).toHaveBeenCalledWith('actionsToken', 'faketoken')
  expect(saveStateMock).toHaveBeenCalledWith('comment_id', 123)
})

test('successfully runs the action with parameters', async () => {
  const body = '.test | test1 test2 --vm-size=chonky'
  github.context.payload.comment!.body = body
  process.env.INPUT_COMMAND = body
  expect(await run()).toBe('success')
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', body)
  expect(setOutputMock).toHaveBeenCalledWith('triggered', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('comment_id', 123)
  expect(setOutputMock).toHaveBeenCalledWith('ref', 'test-ref')
  expect(setOutputMock).toHaveBeenCalledWith('continue', 'true')
  expect(setOutputMock).toHaveBeenCalledWith(
    'params',
    'test1 test2 --vm-size=chonky'
  )
  expect(saveStateMock).toHaveBeenCalledWith('isPost', 'true')
  expect(saveStateMock).toHaveBeenCalledWith('actionsToken', 'faketoken')
  expect(saveStateMock).toHaveBeenCalledWith('comment_id', 123)
})

test('successfully runs the action after trimming the body', async () => {
  const body = '.test    \n\t\n   '
  github.context.payload.comment!.body = body
  process.env.INPUT_COMMAND = body
  expect(await run()).toBe('success')
  expect(setOutputMock).toHaveBeenCalledWith('comment_body', '.test')
  expect(setOutputMock).toHaveBeenCalledWith('triggered', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('comment_id', 123)
  expect(setOutputMock).toHaveBeenCalledWith('ref', 'test-ref')
  expect(setOutputMock).toHaveBeenCalledWith('continue', 'true')
  expect(setOutputMock).toHaveBeenCalledWith('params', '')
  expect(saveStateMock).toHaveBeenCalledWith('isPost', 'true')
  expect(saveStateMock).toHaveBeenCalledWith('actionsToken', 'faketoken')
  expect(saveStateMock).toHaveBeenCalledWith('comment_id', 123)
})

test('fails due to a bad context', async () => {
  vi.mocked(contextCheck.contextCheck).mockImplementation(async () => {
    return {valid: false, context: 'pull_request'}
  })
  expect(await run()).toBe('safe-exit')
})

test('fails due to no trigger being found', async () => {
  process.env.INPUT_COMMAND = '.shipit'
  expect(await run()).toBe('safe-exit')
  expect(infoMock).toHaveBeenCalledWith('⛔ no command detected in comment')
})

test('fails prechecks', async () => {
  vi.mocked(prechecks.prechecks).mockImplementation(() => {
    return {
      ref: 'test-ref',
      status: false,
      message: '### ⚠️ Cannot proceed with operation... something went wrong',
      noopMode: false
    } as never
  })
  vi.mocked(actionStatus.actionStatus).mockImplementation(async () => undefined)
  expect(await run()).toBe('failure')
  expect(saveStateMock).toHaveBeenCalledWith('bypass', 'true')
  expect(setFailedMock).toHaveBeenCalledWith(
    '### ⚠️ Cannot proceed with operation... something went wrong'
  )
})