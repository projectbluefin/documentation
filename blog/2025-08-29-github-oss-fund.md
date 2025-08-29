---
title: Github Open Source Fund
authors: [castrojo]
---

Today we're happy to announce that Bluefin was one of the 71 projects selected for Github's [Secure Open Source Fund](https://github.blog/open-source/maintainers/securing-the-supply-chain-at-scale-starting-with-71-important-open-source-projects/). We applied for and were selected earlier this year, with [tulilirockz](https://github.com/tulilirockz) representing the team and working with GitHub -- getting some awesome training and some funding to work on improving our security posture. 

This has led to us publishing our SBOMs and in general giving everything a once over. [p5](https://github.com/p5) also dove in to ensure we're rocking and rolling to secure our supply chain. Though we still depend on many third party sources for our software, we've severely cut that down, bringing things inhouse when necessary or removing a dependency alltogether. Thanks to p5's automation work the project is constantly rebuilding when there's a new base image, ensuring that you're getting those timely security updates!

This was also a good time for us to work with [Alan Pope](https://blog.popey.com/) and the rest of the crew at [Anchore](https://anchore.com/). The team deployed [Syft](https://github.com/anchore/syft) across our important repos and got to work. 

This work is of course, always ongoing. I am still green in this field myself, if you're looking to learn more start here with the [OpenSSF](https://openssf.org/)

- [GitHub Secure Open Source Fund](https://resources.github.com/github-secure-open-source-fund/)
