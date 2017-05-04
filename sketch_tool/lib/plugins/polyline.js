import z from 'sketch2/util/zdom';
import BasePlugin from './base-plugin';
import { injectStyleSheet, injectSVGDefs } from 'sketch2/util/dom-style-helpers';

export const VERSION = '0.1';
export const GRADEABLE_VERSION = '0.1';

export default class Polyline extends BasePlugin {

  constructor(params, app) {
    let iconSrc = params.closed ? './plugins/polyline/polyline-closed-icon.svg'
                                : './plugins/polyline/polyline-open-icon.svg';
    // Add params that are specific to this plugin
    params.icon = {
      src: iconSrc,
      alt: 'Polyline tool',
      color: params.color
    };
    if (params.closed && params.fillColor) {
        params.icon.fillColor = params.fillColor;
    }
    super(params, app);
    // Message listeners
    this.app.__messageBus.on('addPolyline', (id, index) => {this.addPolyline(id, index)});
    this.app.__messageBus.on('deletePolylines', () => {this.deletePolylines()});
    this.app.__messageBus.on('finalizeShapes', (id) => {this.drawEnd(id)});
    this.closed = false;
    this.fillColor = 'none';
    if (params.closed) {
      this.closed = params.closed;
    }
    if (params.fillColor) {
      this.fillColor = params.fillColor;
    }
  }

  getGradeable() {
    return this.state.map(spline => {
      return {
        spline: spline.map(point => [point.x, point.y])
      };
    });
  }

  addPolyline(id, index) {
    if (this.id === id) {
      this.delIndices.push(index);
    }
  }

  deletePolylines() {
    if (this.delIndices.length !== 0) {
      this.delIndices.sort();
      for (let i = this.delIndices.length -1; i >= 0; i--) {
        this.state.splice(this.delIndices[i], 1);
      }
      this.delIndices.length = 0;
      this.render();
    }
  }

  // This will be called when clicking on the SVG canvas after having
  // selected the line segment shape
  initDraw(event) {
    let x = event.clientX - this.params.left,
        y = event.clientY - this.params.top;
    // We already have at least one polyline defined, add new points to the last one
    if (this.state.length > 0) {
      this.state[this.state.length-1].push({
        x: x,
        y: y
      });
    }
    // Create our first polyline
    else {
      this.state.push([{
        x: x,
        y: y
      }]);
    }
    this.app.addUndoPoint();
    this.render();
    event.stopPropagation();
    event.preventDefault();
  }

  drawEnd(id) {
    // To signal that a polyline has been completed, push an empty array
    if (id !== this.id && id !== 'undo' && id !== 'redo' &&
        this.state.length > 0 && this.state[this.state.length-1].length !== 0) {
        this.state.push([]);
        this.app.addUndoPoint();
    }
    this.render();
    event.stopPropagation();
    event.preventDefault();
  }

  polylineStrokeWidth(index) {
    return index === this.state.length-1 ? '3px' : '2px';
  }

  pointRadius(polylineIndex) {
    return this.state[polylineIndex].length === 1 ? 4 : 8;
  }

  pointOpacity(polylineIndex) {
    return this.state[polylineIndex].length === 1 ? '' : 0;
  }

  render() {
    z.render(this.el,
      z.each(this.state, (polyline, polylineIndex) =>
        // Draw visible polyline under invisible polyline
          z('path.visible-' + polylineIndex + '.polyline' + '.plugin-id-' + this.id, {
            d: polylinePathData(this.state[polylineIndex], this.closed),
            style: `
                stroke: ${this.params.color};
                stroke-width: ${this.polylineStrokeWidth(polylineIndex)};
                stroke-dasharray: ${computeDashArray(this.params.dashStyle)};
                fill: ${this.fillColor};
              `
          })

      ),
      z.each(this.state, (polyline, polylineIndex) =>
        // Draw invisible and selectable polyline under invisible points
        z('path.invisible-' + polylineIndex + this.readOnlyClass(), {
          d: polylinePathData(this.state[polylineIndex], this.closed),
          style: `
              stroke: ${this.params.color};
              stroke-width: 10px;
              stroke-dasharray: solid;
              fill: ${this.fillColor};
              opacity: 0;
            `,
          onmount: el => {
            this.app.registerElement({
              ownerID: this.params.id,
              element: el,
              initialBehavior: 'none',
              onDrag: ({dx, dy}) => {
                for (let pt of this.state[polylineIndex]) {
                  pt.x += dx;
                  pt.y += dy;
                }
                this.render();
              },
              inBoundsX: (dx) => {
                for (let pt of this.state[polylineIndex]) {
                  if (!this.inBoundsX(pt.x + dx)) {
                    return false;
                  }
                }
                return true;
              },
              inBoundsY: (dy) => {
                for (let pt of this.state[polylineIndex]) {
                  if (!this.inBoundsY(pt.y + dy)) {
                    return false;
                  }
                }
                return true;
              }
            });
          }
        })
      ),
      z.each(this.state, (polyline, polylineIndex) =>
        // Draw invisible (when length of polyline > 1) and selectable points
        z.each(polyline, (pt, ptIndex) =>
          z('circle.invisible-' + polylineIndex + this.readOnlyClass(), {
            cx: this.state[polylineIndex][ptIndex].x,
            cy: this.state[polylineIndex][ptIndex].y,
            r: this.pointRadius(polylineIndex),
            style: `
              fill: ${this.params.color};
              stroke-width: 0;
              opacity: ${this.pointOpacity(polylineIndex)};
            `,
            onmount: el => {
              this.app.registerElement({
                ownerID: this.params.id,
                element: el,
                initialBehavior: 'none',
                onDrag: ({dx, dy}) => {
                  this.state[polylineIndex][ptIndex].x += dx;
                  this.state[polylineIndex][ptIndex].y += dy;
                  this.render();
                },
                inBoundsX: (dx) => {
                  return this.inBoundsX(this.state[polylineIndex][ptIndex].x + dx);
                },
                inBoundsY: (dy) => {
                  return this.inBoundsY(this.state[polylineIndex][ptIndex].y + dy)
                },
              });
            }
          })
        )
      )
    );
  }

  inBoundsX(x) {
    return x >= this.bounds.xmin && x <= this.bounds.xmax;
  }

  inBoundsY(y) {
    return y >= this.bounds.ymin && y <= this.bounds.ymax;
  }
}

const strokeWidth = 2;  // TODO: pass in
function computeDashArray(dashStyle) {
  var scale = Math.pow(strokeWidth, 0.6); // seems about right perceptually
  switch (dashStyle) {
    case 'dashed': return 5*scale + ',' + 3*scale;
    case 'longdashed': return 10*scale + ',' + 3*scale;
    case 'dotted': return 2*scale + ',' + 2*scale;
    case 'dashdotted': return 7*scale + ',' + 3*scale + ',' + 1.5*scale + ',' + 3*scale;
    case 'solid':  // falls through
    default: return '';
  }
}

function polylinePathData(points, closed) {
  var result;
  if (points.length < 2) return '';
  const coords = points.map(p => `${p.x},${p.y}`);
  result = `M${coords[0]} L${coords.splice(1).join(' L')}`;
  return closed ? result + ` L${coords[0]}` : result;
}
