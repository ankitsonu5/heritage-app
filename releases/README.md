# Release artifacts

Release binaries are not committed to this repository. APK and Android App Bundle
files in this directory are ignored by Git.

Publish production artifacts as assets on the repository's GitHub Releases page:

1. Build and test the release.
2. Create a version tag such as `v1.2.0`.
3. Create a GitHub Release from that tag.
4. Attach the signed `.aab` or `.apk` and its SHA-256 checksum.

The legacy APK files removed from the repository root may be kept locally in this
directory until they are uploaded to the appropriate GitHub Release.

