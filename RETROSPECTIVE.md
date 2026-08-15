# Project Retrospective

## Background

MBAPIWEBLOG was one of my earlier hobby projects, created around 2023 to provide MineBerry server statistics through a website and API. It allowed users to view player statistics, leaderboards, and historical statistics, while also providing an API that could be used by Discord bots and other applications.

At the time, I was still learning the fundamentals of backend development and data management. Looking back at the project with what I know now, there are several design decisions that I would approach very differently.

## Problems With the Original Implementation

### 1. Poor Data Storage Design

I originally stored player data using individual JSON files. The structure was roughly:

```text
databases/
└── {date}/
    └── {username}.data
```

This worked for a small hobby project, but it was a poor choice for a system that was expected to handle a growing amount of data. But as time went on with the closed-sourced, more polished version. Pushing and pulling the repo became a hassle because of the growing db.

At the time, I did not have much knowledge of databases or database design, so using files seemed like a straightforward solution. In hindsight, a proper database would have been much more appropriate for storing player statistics and historical data.

### 2. No Rate Limiting

The API did not have proper rate limiting.

This meant that requests were not sufficiently restricted, which could potentially allow excessive requests to put unnecessary load on the server.

This is especially noticeable in hindsight because the project exposed an API intended to be used by other applications.

### 3. The Private Version Had the Same Problems

There was a private version of MBAPIWEBLOG that was actually used by other people, while this repository contains the public version.

Despite the private version being the more actively used version, I still did not properly address the database and rate-limiting issues.

The main reason was simple: **I did not know enough about databases or backend architecture at the time.**

## What I Would Change

If I were rebuilding this project today, I would:

* Replace the individual JSON files with a proper database.
* Add API rate limiting.
* Add proper input validation.
* Improve error handling.
* Separate the API, database, and application logic more cleanly.
* Improve authentication and authorization where necessary.
* Improve configuration and secret management.
* Add automated testing.
* Use a more maintainable project structure.

## Lessons Learned

This project taught me that getting something working is not the same as designing it well.

At the beginning, I was mainly focused on making the website and API function. That approach worked for a small hobby project, but it did not scale well and resulted in several architectural problems.

The biggest lesson was the importance of understanding the tools being used rather than simply using whatever implementation is easiest at the time.

I also learned that security and scalability should be considered early, especially when creating an API that other people can access.

Most importantly, this project gives me a useful reference for how much I have learned since I originally built it. The implementation has many flaws, but those flaws also show where my understanding of backend development has improved.

> **Note to future me:** Don't confuse "it works" with "it's well designed." If I ever rebuild this project, design the architecture first, especially the database and API limits, instead of patching problems after everything is already built.
