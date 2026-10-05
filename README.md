# Pebble

**A calm place to break big plans into small, manageable steps.**

Pebble is a lightweight organizer for capturing thoughts, breaking them into smaller steps, and keeping track of things without the structure of a traditional task manager.

Rather than treating everything as a task that must be completed or deleted, Pebble lets items **settle** when they no longer need attention while keeping them available for reference.

## Features

- Create Pebbles for thoughts, intentions, tasks, or reminders
- Break Pebbles into smaller subpebbles
- Edit Pebbles and subpebbles without recreating them
- Settle items without deleting them
- Focus on a single Pebble and its smaller steps
- Automatically surface recently added or edited Pebbles
- Persist data locally between sessions
- Responsive interface for desktop and mobile
- Automatically migrate legacy Pebble V1 data to the V2 structure

## Pebble V2

Pebble originally started as one of my first JavaScript projects.

V2 revisits the original application with a focus on improving its internal architecture and user experience while preserving the simplicity of the original idea.

The application was refactored to separate:

- State operations
- Persistence
- Rendering
- Event handling
- Initialization

The interface was also redesigned around the newer editing, settled-state, focus, and recency behaviors.

Pebble V2 uses an explicitly versioned `localStorage` data structure and includes migration support for data created by the original V1 application.

## Built With

- HTML
- CSS
- Vanilla JavaScript
- localStorage

No frameworks or external application dependencies are required.

## Data & Privacy

Pebble stores its application data locally in the browser using `localStorage`.

There are no accounts, servers, or external databases. Clearing browser storage will remove locally saved Pebble data.

## What I Learned

Rebuilding Pebble became an exercise in maintaining and improving an existing application rather than simply adding more features.

The V2 work focused on:

- Separating application responsibilities
- Evolving persisted data safely through schema versioning and migration
- Using event delegation for dynamically rendered interfaces
- Preserving existing behavior while refactoring
- Designing new features around an established architecture
- Testing changes against legacy user data
- Performing regression testing before release

Pebble V2 represents the difference between getting an application to work and learning how to make an existing application easier to understand, maintain, and extend.