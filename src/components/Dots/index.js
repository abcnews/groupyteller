import React from "react";
import { select } from "d3-selection";
import { scaleOrdinal } from "d3-scale";
import { csv } from "d3-request";
import { path } from "d3-path";
import ranger from "power-ranger";
import { labeler } from "../../libs/labeler";
import {
  forceSimulation,
  forceCollide,
  forceCenter,
  forceManyBody,
  forceX,
  forceY
} from "d3-force";
import {
  deg2rad,
  getRandomInCircle,
  hexToRgbA,
  tspans,
  wordwrap
} from "../../utils";
import "../../poly";

import styles from "./styles.scss";

// Set ABC color scale. Matches measure names with colors

export default class Dots extends React.Component {
  constructor(props) {
    super(props);
    this.rootRef = React.createRef();
    this.data = new Promise((resolve, reject) => {
      csv(this.props.dataUrl, (err, json) => {
        if (err) return reject(err);
        resolve(json);
      });
    });
  }

  componentWillReceiveProps(nextProps) {
    this.graph.then(g => g.update(nextProps));
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    if (!this.rootRef.current) {
      return;
    }

    this.graph = this.data
      .then(data => {
        const colorMeta = document.querySelector("meta[name=bg-colours]");
        const colorPropertyMeta = document.querySelector(
          "meta[name=bg-colour-property]"
        );

        const options = {};
        if (colorMeta) options.colors = colorMeta.content.split(",");
        if (colorPropertyMeta)
          options.colorProperty = colorPropertyMeta.content;
        options.marks = this.props.marks;

        const viz = graph(this.rootRef.current, data, options);
        viz.update(this.props);
        return viz;
      })
      .catch(error => {
        console.error("Could not load data", error);
      });
  }

  componentWillUnmount() {
    // TODO: remove any listeners here
    // ...
  }

  render() {
    return <div className={styles.dots} ref={this.rootRef} />;
  }
}

function graph(mountNode, data, options) {
  options = Object.assign(
    {
      colors: [
        "#3C6998",
        "#B05154",
        "#1B7A7D",
        "#8D4579",
        "#97593F",
        "#605487",
        "#306C3F"
      ],
      colorProperty: "measure",
      margin: 10,
      markRadius: 5,
      markMargin: 7
    },
    options
  );

  let dots = [];
  let clusters = [];

  const { colors, colorProperty, margin, markRadius, markMargin } = options;
  const domain = options.marks.reduce((acc, row) => {
    if (acc.indexOf(row[colorProperty]) === -1) {
      acc.push(row[colorProperty]);
    }
    return acc;
  }, []);

  const colorScale = scaleOrdinal(domain, colors);

  let width;
  let height;
  let measure;
  let comparison;

  // Selections
  const rootSelection = select(mountNode);
  const svgSelection = rootSelection.append("svg");

  let clusterSimulation;
  let dotSimulation;

  const update = props => {
    const { mark } = props;

    if (!mark || (measure === mark.measure && comparison === mark.comparison))
      return;

    measure = mark.measure;
    comparison = mark.comparison;

    if (width !== props.width || height !== props.height) {
      width = props.width;
      height = props.height;
      clusterSimulation = getClusterSimulation();
      dotSimulation = getDotSimulation();
    }

    // Set color according to measure
    const color = colorScale(mark[colorProperty]);

    rootSelection.style("background-color", color);
    document.documentElement.style.setProperty(
      "--panel-bg-color",
      hexToRgbA(color)
    );

    // New data
    clusters = data
      // Just the groups being compared currently
      .filter(d => d.measure === measure && d.comparison === comparison)
      // Add some properties to the groups
      .map(d => {
        const existingCluster = clusters.find(
          c => c.measure === d.measure && c.group === d.group
        );

        const cluster = existingCluster || {
          ...d,
          x: width / 2,
          y: height / 2
        };

        return {
          ...cluster,
          r: Math.sqrt((+d.value * (markRadius + markMargin) * 35) / Math.PI),
          value: +d.value,
          groupLines: wordwrap(d.group, 10)
        };
      });

    // const totalValue = clusters.reduce(
    //   (total, group) => (total += +group.value),
    //   0
    // );
    //
    // // Failsafe for bad data
    // if (totalValue !== 100) {
    //   console.error(
    //     `Group error: total value is ${totalValue}, it should be 100`,
    //     clusters
    //   );
    //   return;
    // }
    const requiredDots = clusters.reduce(
      (dots, cluster) =>
        dots.concat(
          ranger(+cluster.value, i => {
            return {
              // Random spread of dots on reload
              ...getRandomInCircle(0, width, 0, height),
              cluster: cluster
            };
          })
        ),
      []
    );

    const dotsPrime = dots.slice();

    dots = requiredDots
      .map(template => {
        const foundId = dotsPrime.findIndex(d => {
          return d.cluster.group === template.cluster.group;
        });

        if (foundId > -1) {
          const found = dotsPrime.splice(foundId, 1);
          return { ...found[0], cluster: template.cluster };
        }
        return { replaceWith: { ...template } };
      })
      .map(dot => {
        if (!dot.replaceWith) return dot;

        const leftover = dotsPrime.pop();
        return leftover
          ? { ...leftover, cluster: dot.replaceWith.cluster }
          : dot.replaceWith;
      });

    // Basic fix for labels going off top of screen on small mobiles
    // clusters.forEach(d => (d.y += 40)); // Account for label height

    // Labels - using tspans to for multi-line labels
    const groupLabels = svgSelection
      .selectAll(`g.${styles.groupLabel}`)
      .data(clusters)
      .join(enter =>
        enter
          .append("g")
          .attr("class", styles.groupLabel)
          .call(g => {
            g.append("text");
            g.append("path");
          })
      )
      .call(label => label.select("text").call(tspans, d => d.groupLines));

    // Resolve cluster positions
    clusterSimulation.nodes(clusters).alpha(1);

    while (clusterSimulation.alpha() > clusterSimulation.alphaMin()) {
      clusterSimulation.tick();
      // Keep it in the bounds.
      clusters.forEach(d => {
        d.x = Math.min(width - margin * 2 - d.r, Math.max(margin + d.r, d.x));
        d.y = Math.min(height - margin * 2 - d.r, Math.max(margin + d.r, d.y));
      });
    }

    // Setup objects for the label positioner to use
    clusters.forEach(d => {
      d.label = {
        x: d.x,
        y: d.y - d.r - 3 - 15 * d.groupLines.length
      };
      d.anchor = {
        x: d.x,
        y: d.y,
        r: d.r + 20 // Label rotation is jittery
      };
    });

    // Measure the text
    groupLabels.select("text").each(function(d) {
      let bbox = this.getBBox();
      d.label.width = bbox.width;
      d.label.height = bbox.height;
      d.label.name = d.group;
    });

    // Calculate label positions
    labeler()
      .label(clusters.map(d => d.label))
      .anchor(clusters.map(d => d.anchor))
      .width(width - margin * 2)
      .height(height - margin * 2)
      .start(clusters.length * 2);

    // Position the text
    groupLabels
      .select("text")
      .attr("transform", d => `translate(${d.label.x}, ${d.label.y})`);

    // Draw the arc
    groupLabels.select("path").attr("d", d => {
      let ctx = path();
      let rad = Math.atan2(d.label.y - d.y, d.label.x - d.x);
      ctx.arc(
        d.anchor.x,
        d.anchor.y,
        d.r,
        rad - deg2rad(30),
        rad + deg2rad(30)
      );
      ctx.moveTo(
        (d.r + 10) * Math.cos(rad) + d.x,
        (d.r + 10) * Math.sin(rad) + d.y
      );
      ctx.lineTo(d.r * Math.cos(rad) + d.x, d.r * Math.sin(rad) + d.y);
      return ctx.toString();
    });

    // Add all the 'people'
    const circles = svgSelection
      .selectAll(`circle.${styles.population}`)
      .data(dots)
      .join("circle")
      .attr("class", styles.population)
      .attr("r", markRadius)
      .attr("cx", d => d.x || d.cluster.x)
      .attr("cy", d => d.y || d.cluster.y);

    // Position them
    dotSimulation
      .on("tick", () => {
        circles
          .attr("cx", d => Math.max(margin, Math.min(width - margin, d.x)))
          .attr("cy", d => Math.max(margin, Math.min(height - margin, d.y)));
      })
      .nodes(dots)
      .alpha(1.3)
      .restart();
  };

  function getDotSimulation() {
    return forceSimulation()
      .force(
        "x",
        forceX(d =>
          d.cluster && d.cluster.x ? d.cluster.x : width / 2
        ).strength(0.06)
      )
      .force(
        "y",
        forceY(d =>
          d.cluster && d.cluster.y ? d.cluster.y : height / 2
        ).strength(0.06)
      )
      .force(
        "collide",
        forceCollide(markMargin)
          .strength(1)
          .iterations(3)
      );
  }

  function getClusterSimulation() {
    return (
      forceSimulation()
        .force("gravity", forceCenter(width / 2, height / 2))
        .force(
          "attract",
          forceManyBody()
            .strength(100)
            .distanceMin(10)
            .distanceMax(Math.max(width, height) * 2)
        )
        // .force(
        //   "repel",
        //   forceManyBody()
        //     .strength(-1000)
        //     .distanceMax(Math.min(width, height) - margin * 2 + 90)
        // )
        .force("collide", forceCollide(c => c.r + 40).iterations(3))
        .stop()
    );
  }

  return { update };
}
