# JSTT - JavaScript Testability Tool
This app was developed to perform tasks and visualize data during a master's thesis. It consists of a REST-API and a web-based UI. Some tasks, especially the creation of a random dataset and the collection of source code metrics in GitHub repositories can be reused easily.

## Setup
To install this project, clone the repo and run `npm install`.

The main NodeJS application can be started with `npm start`. With `npm run debug`, the application is started in self-reloading development mode.

For correlation analysis, also a small Python server is included in this project. To start the Python server, use `npm run py-start` or `py-debug`.

You can open the UI of the main app in your browser as `localhost/ui/index`. From there most things can be done in the UI.

### Environment
The app uses environment variables for authentication data for GitHub- and Libraries.io-APIs. Create a file called `.env` in the root directory with the following entries:
```
GITHUB_KEY=<github_api_key>
LIO_KEY=<libraries_io_api_key>
```
The LIO key is optional and only needed when you want to use the LibrariesIO lib.

## Usage

### Dataset creation

All data that is created is saved in projects as JSON. You can see some example projects with different datasets listed on the home page. You can also create a new project to create a new dataset. You have the following options:
1. Type: GitHub or NPM as the source of projects/repositories
2. Name: Name of the project
3. Size: Number of projects/repositories in the dataset
4. Languages: Any languages that are available on GitHub/NPM
5. Query additions: For GitHub projects, you can specify query options to restrict the sampling frame

On the project page, you can start the necessary tasks for dataset creation.
1. Create "counts": The tool calculates the size of the sampling frame by fetching the number of repositories for every language and year. This fine-grained process is necessary because the GitHub-API restricts query execution times.
2. Fetch randoms: Random numbers are fetched from random.org for repository selection.
3. Fetch repositories: The tool creates the dataset by using the randoms number as repository indices (repositories are sorted by creation date). This may take some time.

The resulting data is stored in the local project directory.

### Other

The tool implements many tasks that build on the created dataset, you can study the code or UI yourself or contact me if you are interested in more information.
Examples:
- Counting and fetching commits and pull requests
- Check if project has package.json
- Find project dependencies
- Download repos
- Check if repo contains tests
- Calc static metrics for repo
- Guide through manual repo data collection including dynamic metrics, categories, test framework etc.
- Manual connection establishment of test and source code files
- Calc correlations between test and source code metrics
- Calc testability scores for files, projects, categories etc.
- Mine refactorings from JS repos (needs additional apps that are not included)
- Classify and add refactorings
- Display and list relevant data like repos, commits, refactorings etc.

## File structure
- /knowledge: data that is used globally
- /lib: backend libraries, they are structured for reuse and partly documented
- /projects: project-specific data
- /scripts: currently only holds playground, which was used for one-time-tasks in the thesis
- /server: backend applications, main nodejs app and python app
- /templates: configuration templates for test frameworks that were used in the process of collection dynamic metrics in the repositories
- /ui: HTML, CSS, JS and fonts that are used for the UI
- .env: Environment variables