# Groupyteller

A more generalised and modernised version of [Census as 100 people](https://github.com/abcnews/census-100-people/).

This uses the [scrollyteller](https://github.com/abcnews/scrollyteller) react component.

## Usage

Most of these instructions are fairly specific to the ABC News environment.

1. Publish a CSV file of data at a publicly available URL.
2. Set up your scrollyteller & panels
3. Add the `[groupyteller]` Associated JS to your story
  
### Data

The data should look like this:

```csv
measure,comparison,group,value
issues,none,all,100
issues,nineteen,environment,29
issues,nineteen,economy,23
issues,nineteen,healthcare,8
issues,nineteen,superannuation and pensions,8
issues,nineteen,others,32
issues,sixteen,economy,25
issues,sixteen,healthcare,16
issues,sixteen,superannuation and pensions,12
issues,sixteen,education,12
issues,sixteen,environment,9
issues,sixteen,others,26
issues,qld,economy,27
issues,qld,environment,24
issues,qld,superannuation and pensions,8
issues,qld,employment,7
issues,qld,others,34
```

Each panel in the visualisation shows all rows in the data set with a combination of `measure` and `comparison`. So, for example, the data above would provide the data required for three panels:

- issues, none
- issues, nineteen
- issues, sixteen
- issues, qld

All rows related to a specific combination of `measure` and `comparison` should add to 100 (or a different `total`, which you can configure later). Lets take `issues` and `nineteen` as an example:

| group                       | value |
| --------------------------- | ----- |
| environment                 | 29    |
| economy                     | 23    |
| healthcare                  | 8     |
| superannuation and pensions | 8     |
| others                      | 32    |

These are the clusters displayed in a single panel of the visualisation. The `group` value is audience facing and used to label each cluster.

### Scrollyteller / panels

A basic story setup will look like this:

```text
Introduction to the story here.
#scrollytellerNAMEgroupytellerMEASUREissuesCOMPARISONnoneCONFIGbase36
This is the text for the first panel which will display the groups associated with the measure 'issues' and the comparison 'none'. (So in this case it will be a single group labeled 'all').
#markMEASUREissuesCOMPARISONsixteen
This is the text associated with the second panel defined above using the #mark fragment. It will show groups from the combo of 'issues' and 'sixteen'.
#endscrollyteller
Some content after the scrollyteller.
```

You can use the data in any order you like, there's no link between the order in the data file and the marks in the scrollyteller config.

The `CONFIG` value (`"base36"`) on the opening scrollyteller tag should be replaced by a [base36-encoded](https://www.abc.net.au/res/sites/news-projects/base-36-props-converter/1.1.0/) object with the following props:

-  `dataURL`, the URL of your CSV data
-  `total`, the total number of dots (optional; default: 100)


## Authors

- Simon Elvery ([simon@elvery.net](mailto:simon@elvery.net))
- Josh Byrd ([byrd.joshua@abc.net.au](mailto:joshua.byrd@abc.net.au))
- Colin Gourlay ([gourlay.colin@abc.net.au](mailto:gourlay.colin@abc.net.au))
