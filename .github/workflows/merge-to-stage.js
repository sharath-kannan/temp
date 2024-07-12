const STAGE = 'main';

const getChecks = ({ pr, github, owner, repo }) =>
  github.rest.checks
    .listForRef({ owner, repo, ref: pr.head.sha })
    .then(({ data }) => {
      const checksByName = data.check_runs.reduce((map, check) => {
        if (
          !map.has(check.name) ||
          new Date(map.get(check.name).completed_at) <
          new Date(check.completed_at)
        ) {
          map.set(check.name, check);
        }
        return map;
      }, new Map());
      pr.checks = Array.from(checksByName.values());
      return pr;
    });

const getReviews = ({ pr, github, owner, repo }) =>
  github.rest.pulls
    .listReviews({
      owner,
      repo,
      pull_number: pr.number,
    })
    .then(({ data }) => {
      pr.reviews = data;
      return pr;
    });

const commentOnPR = async (comment, prNumber) => {
  console.log(comment); // Logs for debugging the action.
  const { data: comments } = await github.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const dayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  const hasRecentComment = comments
    .filter(({ created_at }) => new Date(created_at) > dayAgo)
    .some(({ body }) => body === comment);
  if (hasRecentComment) return console.log('Comment exists for', prNumber);

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: comment,
  });
};
const main = async (params) => {
  github = params.github;
  owner = params.context.repo.owner;
  repo = params.context.repo.repo;
  console.log("owner", owner);
  console.log("repo", repo);
  let prs = await github.rest.pulls
    .list({ owner, repo, state: 'open', per_page: 100, base: STAGE })
    .then(({ data }) => data);
  await Promise.all([
    ...prs.map((pr) => getChecks({ pr, github, owner, repo })),
    ...prs.map((pr) => getReviews({ pr, github, owner, repo })),
  ]);
  prs = prs.filter(({ checks, reviews, number, title }) => {
    if (hasFailingChecks(checks)) {
      commentOnPR(
        `Skipped merging ${number}: ${title} due to failing checks`,
        number
      );
      return false;
    }

    const approvals = reviews.filter(({ state }) => state === 'APPROVED');
    if (approvals.length < REQUIRED_APPROVALS) {
      commentOnPR(
        `Skipped merging ${number}: ${title} due to insufficient approvals. Required: ${REQUIRED_APPROVALS} approvals`,
        number
      );
      return false;
    }

    return true;
  });
  return prs;
};

console.log(process.env.LOCAL_RUN);
if (process.env.LOCAL_RUN) {
  const { github, context } = getLocalConfigs();
  main({
    github,
    context,
  });
}

module.exports = main;
