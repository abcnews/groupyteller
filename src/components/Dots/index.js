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
const defaultColors = [
  "#3C6998",
  "#B05154",
  "#1B7A7D",
  "#8D4579",
  "#97593F",
  "#605487",
  "#306C3F"
];

const colorMeta = document.querySelector("meta[name=bg-colours]");
const color = scaleOrdinal(
  colorMeta ? colorMeta.content.split(",") : defaultColors
);

const colorPropertyMeta = document.querySelector(
  "meta[name=bg-colour-property]"
);

const margin = 10;
const markRadius = 5; // Circle radius
const markMargin = 7;

export default class Dots extends React.Component {
  constructor(props) {
    super(props);

    this.rootRef = React.createRef();

    this.initGraph = this.initGraph.bind(this);
    this.updateGraph = this.updateGraph.bind(this);

    this.data = new Promise((resolve, reject) => {
      csv(this.props.dataUrl, (err, json) => {
        if (err) return reject(err);
        resolve(json);
      });
    });
  }

  componentWillReceiveProps(nextProps) {
    // TODO: Add any conditions that mitigate updating the graph
    this.updateGraph(nextProps);
  }

  shouldComponentUpdate() {
    // Stop React from managing the DOM itself
    return false;
  }

  componentDidMount() {
    this.initGraph(this.props);

    // TODO: add any listeners here
    // ...
  }

  componentWillUnmount() {
    // TODO: remove any listeners here
    // ...
  }

  /**
   * Initialize the graph
   * @param {object} props The latest props that were given to this component
   */
  initGraph(props) {
    if (!this.rootRef.current) {
      return;
    }

    this.currentColor = "none";

    this.rootSelection = select(this.rootRef.current).style(
      "background-color",
      color(this.currentColor)
    );
    this.svgSelection = this.rootSelection.append("svg");

    this.groups;
    this.nodes;
    this.currentMeasure = "none";
    this.currentComparison = "none";
    this.circles = this.svgSelection.selectAll(`circle.${styles.population}`);
    this.groupLabels = this.svgSelection.selectAll(`g.${styles.groupLabel}`);
    this.width = parseInt(this.svgSelection.style("width"));
    this.height = parseInt(this.svgSelection.style("height"));

    const tickFn = () => {
      this.circles
        .attr("cx", d => Math.max(margin, Math.min(this.width - margin, d.x)))
        .attr("cy", d => Math.max(margin, Math.min(this.height - margin, d.y)));
    };

    const { simulationGroups, simulationNodes } = getSimulations(
      this.width,
      this.height,
      margin,
      markMargin,
      tickFn
    );

    this.simulationNodes = simulationNodes;
    this.simulationGroups = simulationGroups;
    this.updateGraph(props);
  }

  /**
   * Update the graph. It is important to only update this component through normal D3 methods.
   * @param {object} props The latest props given to this component
   */
  updateGraph(props) {
    if (!this.rootRef.current) return;

    if (!props.mark) return;
    // TODO: Use D3 to update the graph

    this.currentMeasure = props.mark.measure;
    this.currentComparison = props.mark.comparison;
    console.log("this.currentMeasure", this.currentMeasure);
    // Set color according to measure
    this.currentColor =
      props.mark[colorPropertyMeta ? colorPropertyMeta.content : "measure"];

    this.rootSelection.style("background-color", color(this.currentColor));

    document.documentElement.style.setProperty(
      "--panel-bg-color",
      hexToRgbA(color(this.currentColor))
    );

    // Wait until data exists before we actually react to anything here
    this.data
      .catch(error => {
        console.error("Could not load data", error);
      })
      .then(data => {
        // New data
        this.groups = data.filter(
          d =>
            d.measure === this.currentMeasure &&
            d.comparison === this.currentComparison
        );

        const totalValue = this.groups.reduce(
          (total, group) => (total += +group.value),
          0
        );

        // Failsafe for bad data
        if (totalValue !== 100) {
          console.error(
            `Group error: total value is ${totalValue}, it should be 100`,
            this.groups
          );
          return;
        }

        this.groups.forEach(d => {
          // This is a super rough approximation of circle packing algorithm for which there doesn't appear to be a universal formula for all n between 1 and 100.
          d.r = Math.sqrt(
            (+d.value * (markRadius + markMargin) * 35) / Math.PI
          );

          // For multi-line labels
          d.groupLines = wordwrap(d.group, 10);
        });

        this.nodes = this.groups.reduce(
          (newNodes, group) =>
            newNodes.concat(
              ranger(+group.value, i => {
                let idx = newNodes.length + i;

                if (typeof this.nodes !== "undefined" && this.nodes[idx]) {
                  this.nodes[idx].group = group;
                  return this.nodes[idx];
                }

                return {
                  // Random spread of dots on reload
                  x: getRandomInCircle(
                    0,
                    window.innerWidth,
                    0,
                    window.innerHeight
                  ).x,
                  y: getRandomInCircle(
                    0,
                    window.innerWidth,
                    0,
                    window.innerHeight
                  ).y,
                  group: group
                };
              })
            ),
          []
        );

        // Calculate group positions
        this.simulationGroups.nodes(this.groups).alpha(1);
        resolveGroupPositions();
        // Basic fix for labels going off top of screen on small mobiles
        this.groups.forEach(d => (d.y += 40)); // Account for label height

        // Labels - using tspans to for multi-line labels
        this.groupLabels = this.groupLabels.data(this.groups);
        this.groupLabels.exit().remove();

        this.groupLabelsEnter = this.groupLabels
          .enter()
          .append("g")
          .attr("class", styles.groupLabel);
        this.groupLabelsEnter.append("text");
        this.groupLabelsEnter.append("path");

        this.groupLabels = this.groupLabelsEnter.merge(this.groupLabels);

        this.groupLabels.selectAll("tspan").remove();

        tspans.call(this.groupLabels.select("text"), function(d) {
          return d.groupLines;
        });

        // Setup objects for the label positioner to use
        this.groups.forEach(d => {
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
        this.groupLabels.select("text").each(function(d) {
          let bbox = this.getBBox();
          d.label.width = bbox.width;
          d.label.height = bbox.height;
          d.label.name = d.group;
        });

        const nsweeps = this.groups.length * 2;

        // Calculate label positions
        labeler()
          .label(this.groups.map(d => d.label))
          .anchor(this.groups.map(d => d.anchor))
          .width(this.width - margin * 2)
          .height(this.height - margin * 2)
          .start(nsweeps);

        // Position the text
        this.groupLabels
          .select("text")
          .attr("transform", d => `translate(${d.label.x}, ${d.label.y})`);

        // Draw the arc
        this.groupLabels.select("path").attr("d", d => {
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
        this.circles = this.circles
          .data(this.nodes)
          .enter()
          .append("circle")
          .attr("class", styles.population)
          .attr("r", markRadius)
          .attr("cx", d => d.x || d.group.x)
          .attr("cy", d => d.y || d.group.y)
          .merge(this.circles);
        console.log("pos", this.circles);
        // Position them
        this.simulationNodes
          .nodes(this.nodes)
          .alpha(1.3)
          .restart();
      });

    const resolveGroupPositions = () => {
      while (this.simulationGroups.alpha() > this.simulationGroups.alphaMin()) {
        this.simulationGroups.tick();
        // Keep it in the bounds.
        this.groups.forEach(d => {
          d.x = Math.min(
            this.width - margin * 2 - d.r,
            Math.max(margin + d.r, d.x)
          );
          d.y = Math.min(
            this.height - margin * 2 - d.r,
            Math.max(margin + d.r, d.y)
          );
        });
      }
    };
  }

  render() {
    return <div className={styles.dots} ref={this.rootRef} />;
  }
}

// We need to update the simulations on init and on resize.
function getSimulations(width, height, margin, markMargin, tickFn) {
  const simulationGroups = forceSimulation()
    .force("gravity", forceCenter(width / 2, height / 2))
    .force(
      "attract",
      forceManyBody()
        .strength(1010)
        .distanceMin(10)
    )
    .force(
      "repel",
      forceManyBody()
        .strength(-1000)
        .distanceMax(Math.min(width, height) - margin * 2 + 90)
    )
    .force("collide", forceCollide(75))
    .stop();

  const simulationNodes = forceSimulation()
    .force(
      "x",
      forceX(d => (d.group && d.group.x ? d.group.x : width / 2)).strength(0.05)
    )
    .force(
      "y",
      forceY(d => (d.group && d.group.y ? d.group.y : height / 2)).strength(
        0.05
      )
    )
    .force("collide", forceCollide(markMargin).strength(1))
    .on("tick", tickFn);

  return { simulationGroups, simulationNodes };
}
