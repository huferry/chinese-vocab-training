Make a new release of the Chinese Vocabulary Training app.

Steps:
1. Ask the user is this a minor or a patch release.
2. Update the `version` field in `package.json` to the new version.
3. Build the Docker image and tag it as `huferry/chinese-vocab-training:<version>` and `huferry/chinese-vocab-training:latest`.
4. Create a git commit with message `Release <version>`.
5. Create a git tag `v<version>`.
6. Add a release note in the Release Note section in README.md
7. Push the commit and the tag to the remote.
8. Push to Docker Hub
9. Install/update the container on server 'Kingston' (use config in .env)
10. Report what was done.
