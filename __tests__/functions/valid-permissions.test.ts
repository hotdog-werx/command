import {test, expect, beforeEach, vi} from 'vitest'
import {validPermissions} from '../../src/functions/valid-permissions'
import * as core from '@actions/core'

vi.mock('@actions/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@actions/core')>()
  return {
    ...actual,
    setOutput: vi.fn()
  }
})

const setOutputMock = vi.mocked(core.setOutput)

// hand-rolled fakes, rebuilt per test
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let octokit: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let context: any

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(core.setOutput).mockImplementation(() => {})
  process.env.INPUT_PERMISSIONS = 'write,admin'

  context = {
    actor: 'monalisa'
  }

  octokit = {
    rest: {
      repos: {
        getCollaboratorPermissionLevel: vi.fn().mockReturnValueOnce({
          status: 200,
          data: {
            permission: 'write'
          }
        })
      }
    }
  }
})

test('determines that a user has valid permissions to invoke the Action', async () => {
  expect(await validPermissions(octokit, context)).toEqual(true)
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
})

test('determines that a user has does not valid permissions to invoke the Action', async () => {
  octokit.rest.repos.getCollaboratorPermissionLevel = vi
    .fn()
    .mockReturnValue({
      status: 200,
      data: {
        permission: 'read'
      }
    })

  expect(await validPermissions(octokit, context)).toEqual(
    '👋 __monalisa__, seems as if you have not write/admin permissions in this repo, permissions: read'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
})

test('fails to get actor permissions due to a bad status code', async () => {
  octokit.rest.repos.getCollaboratorPermissionLevel = vi
    .fn()
    .mockReturnValue({
      status: 500
    })

  expect(await validPermissions(octokit, context)).toEqual(
    'Permission check returns non-200 status: 500'
  )
  expect(setOutputMock).toHaveBeenCalledWith('actor', 'monalisa')
})