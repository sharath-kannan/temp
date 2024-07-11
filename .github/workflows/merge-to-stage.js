const main = async (params) => {
  github = params.github;
  owner = params.context.repo.owner;
  repo = params.context.repo.repo;
  console.log("owner",owner);
  console.log("repo",repo);
  let prs = await github.rest.pulls
    .list({ owner, repo, state: 'open', per_page: 100, base: STAGE })
    .then(({ data }) => data);
  console.log(prs);
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
