const main = async (params) => {
  github = params.github;
  owner = params.context.repo.owner;
  repo = params.context.repo.repo;
  console.log("owner",owner);
  console.log("repo",repo);
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
