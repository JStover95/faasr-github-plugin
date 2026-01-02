# FaaSr GitHub App MVP Overview

This GitHub app is an extension of the existing FaaSr framework. Refer to [faasr-docs/docs](./faasr-docs/docs/) for details on the FaaSr framework. The FaaSr-workflow repository is included as a git subtree in [faasr-workflow](./faasr-workflow/) for reference.

It is assumed the user already has a complete FaaSr workflow that they created with the FaaSr Workflow Builder GUI.

This GitHub app is a minimal proof-of-concept and is strictly limited to proving functionality.

## User Stories

I am a researcher with R and Python scripts that I want to run at scheduled intervals to process data. I navigate to the FaaSr website and click "Install FaaSr." The website prompts me to authenticate with GitHub, and I log in with my GitHub account. After authenticating, I receive a notification that a FaaSr-workflow repo has been forked into my account. I upload my workflow JSON and receive a notification that it has been successfully registered in my FaaSr-workflow fork.

## Implementation Details

### Current User Flow

1. The user logs in to their GitHub account and navigates to the FaaSr/FaaSr-workflow repo.
2. The user navigates to the FaaSr Workflow Builder GUI, creates their workflow, and downloads the workflow JSON.
3. The user navigates to their FaaSr-workflow fork and uploads their workflow JSON.
4. The user navigates to the **Actions** tab and locates the [**FaaSr Register**](./faasr-workflow/.github/workflows/register-workflow.yml) GitHub workflow.
5. The user uses the GitHub workflow dispatch UI to enter the name of their workflow JSON and manually triggers the FaaSr Register workflow.
6. The workflow is then registered and ready to be triggered with the **FaaSr Invoke** workflow.

### Proposed User Flow

1. The user navigates to the FaaSr web app.
2. The user clicks on **Install FaaSr** and authenticates using their GitHub account.
3. The FaaSr web app creates a fork of the FaaSr-workflow repository on the user's account.
4. The user uploads their workflow JSON to the web app.
5. The web app commits it to the user's FaaSr-workflow fork and triggers the **FaaSr Register** workflow.
6. The workflow is then registered and ready to be triggered with the **FaaSr Invoke** workflow.
