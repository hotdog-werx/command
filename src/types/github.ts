import type * as github from '@actions/github'

// The type of the hydrated octokit client that getOctokit() builds
export type Octokit = ReturnType<typeof github.getOctokit>

// The type of the GitHub Actions event context
export type Context = typeof github.context