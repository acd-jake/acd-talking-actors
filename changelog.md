# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-11-04

### Added

- Stage directions for speech: `/talk (angry and shouting) Get out of my sight!`. The direction is spoken by ElevenLabs to set the tone, then cut from the audio at the following pause, and shown in small italics above the message. Replay also omits it.

## [1.2.0] - 2026-11-04

### Added

- A speech-status line below spoken chat messages shows the preparation stages and the elapsed waiting time.
- A `ChatVoiceResolver` that resolves voices for chat commands.

### Changed

- Requires Foundry VTT 14 (minimum compatibility raised from 13).
- The Voice Settings dialog now uses ApplicationV2 and the light theme, with updated styles.
- The actor context menu entry uses the v14 `label`, `visible` and `onClick` keys.

### Fixed

- Long speech no longer disconnects the sending client; audio is now broadcast in small packets.
- Removed the deprecated global `PlaylistDirectory` access in the sound effects sidebar.

## [1.1.0]

### Added

- Support for tokens without linked actors.

## [1.0.6]

### Changed

- Updated for Foundry VTT 14.
