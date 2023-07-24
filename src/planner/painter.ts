import * as Colors from "../common/colors";
import { LatheCode, Point, Segment } from "../common/lathecode";

export class Painter {
  constructor(private latheCode: LatheCode, private pxPerMm: number) {}

  createTool(): OffscreenCanvas {
    const tool = this.latheCode.getTool();
    if (tool.type === 'RECT') {
      const widthPixels = tool.widthMm * this.pxPerMm;
      const heightPixels = tool.heightMm * this.pxPerMm;
      const cornerRadiusPixels = tool.cornerRadiusMm * this.pxPerMm;
      const result = new OffscreenCanvas(widthPixels, heightPixels);
      const ctx = result.getContext('2d')!;
      ctx.strokeStyle = Colors.COLOR_TOOL.hex();
      ctx.fillStyle = Colors.COLOR_TOOL_FILL.hex();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cornerRadiusPixels, 0);
      ctx.lineTo(widthPixels - cornerRadiusPixels, 0);
      ctx.arcTo(widthPixels, 0, widthPixels, cornerRadiusPixels, cornerRadiusPixels);
      ctx.lineTo(widthPixels, heightPixels - cornerRadiusPixels);
      ctx.arcTo(widthPixels, heightPixels, widthPixels - cornerRadiusPixels, heightPixels, cornerRadiusPixels);
      ctx.lineTo(cornerRadiusPixels, heightPixels);
      ctx.arcTo(0, heightPixels, 0, heightPixels - cornerRadiusPixels, cornerRadiusPixels);
      ctx.lineTo(0, cornerRadiusPixels);
      ctx.arcTo(0, 0, cornerRadiusPixels, 0, cornerRadiusPixels);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return result;
    }
    if (tool.type === 'ROUND') {
      const widthPixels = tool.cornerRadiusMm * 2 * this.pxPerMm;
      const heightPixels = tool.cornerRadiusMm * 2 * this.pxPerMm;
      const cornerRadiusPixels = tool.cornerRadiusMm * this.pxPerMm;
      const result = new OffscreenCanvas(widthPixels, heightPixels);
      const ctx = result.getContext('2d')!;
      ctx.strokeStyle = Colors.COLOR_TOOL.hex();
      ctx.fillStyle = Colors.COLOR_TOOL_FILL.hex();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cornerRadiusPixels, 0);
      ctx.arcTo(widthPixels, 0, widthPixels, cornerRadiusPixels, cornerRadiusPixels);
      ctx.arcTo(widthPixels, heightPixels, widthPixels - cornerRadiusPixels, heightPixels, cornerRadiusPixels);
      ctx.arcTo(0, heightPixels, 0, heightPixels - cornerRadiusPixels, cornerRadiusPixels);
      ctx.arcTo(0, 0, cornerRadiusPixels, 0, cornerRadiusPixels);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return result;
    }
    throw new Error(`tool of type ${tool.type} not implemented`);
  }

  createCanvas(): OffscreenCanvas {
    const stock = this.latheCode.getStock();
    if (!stock) throw new Error('Error: specify stock');
    if (stock.diameter == 0) throw new Error('Error: stock diameter is 0');
    if (stock.length == 0) throw new Error('Error: stock length is 0');
    const insideSegments = this.latheCode.getInsideSegments();
    const outsideSegments = this.latheCode.getOutsideSegments();
    if (insideSegments.length && outsideSegments.length) throw new Error('Error: inside and outside not supported yet');
    if (!insideSegments.length && !outsideSegments.length) throw new Error('Error: no segments');
    const canvas = new OffscreenCanvas(stock.length * this.pxPerMm, stock.diameter / 2 * this.pxPerMm);
    const ctx = canvas.getContext('2d')!;
    this.fillSegments(ctx, stock.getSegments(), Colors.COLOR_STOCK.hex());
    this.fillSegments(ctx, insideSegments.length ? insideSegments : outsideSegments, Colors.COLOR_PART.hex());
    return canvas;
  }

  private fillSegments(ctx: OffscreenCanvasRenderingContext2D, segments: Segment[], color: string) {
    ctx.beginPath();
    ctx.moveTo(this.zToX(segments[0].start.z), this.xToY(segments[0].start.x));
    for (let s of segments) {
      const isLineCircle = (s.type === 'CONV' || s.type === 'CONC') && s.start.x === s.end.x;
      if (s.type === 'LINE' || isLineCircle) ctx.lineTo(this.zToX(s.end.z), this.xToY(s.end.x));
      else if (s.type === 'CONV' || s.type === 'CONC') this.ellipse(ctx, s, s.type === 'CONV');
      else throw new Error('Unable to paint segment of type ' + s.type);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  private ellipse(ctx: OffscreenCanvasRenderingContext2D, s: Segment, convex: boolean) {
    const asc = s.end.x > s.start.x;
    const center = asc === convex ? new Point(s.start.x, s.end.z) : new Point(s.end.x, s.start.z);
    let startAngle = 0;
    let endAngle = 0;
    let counterclockwise = false;
    if (asc && convex) {
      startAngle = 0;
      endAngle = Math.PI / 2;
    } else if (asc && !convex) {
      startAngle = Math.PI * 3 / 2;
      endAngle = Math.PI;
      counterclockwise = true;
    } else if (!asc && convex) {
      startAngle = Math.PI / 2;
      endAngle = Math.PI;
    } else if (!asc && !convex) {
      startAngle = Math.PI * 2;
      endAngle = Math.PI * 3 / 2;
      counterclockwise = true;
    }
    ctx.ellipse(this.zToX(center.z), this.xToY(center.x), Math.abs(s.end.z - s.start.z) * this.pxPerMm, Math.abs(s.end.x - s.start.x) * this.pxPerMm, 0, startAngle, endAngle, counterclockwise);
  }

  private xToY(x: number) {
    return x * this.pxPerMm;
  }

  private zToX(z: number) {
    return this.latheCode.getStock()!.length * this.pxPerMm - z * this.pxPerMm;
  }
}
