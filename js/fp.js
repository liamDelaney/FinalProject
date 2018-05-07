const tickerData = {};
let eventData;
const margin = {
  top: 50,
  right: 0,
  bottom: 60,
  left: 70,
};

const timelineTop = 40; // timeline's distance from x-axis
const dotRadius = 5; // normal circle size
const dotFocusedRadius = 10; // enlarged circle size
const timelineHeight = 2 * dotRadius;
const vlineTextTop = 40; // vertical line label's top margin
const vlineTextOffset = 20; // vertical line label's top offset

let width;
let height;
let xScale = null;
let yScale = null;
let currentXScale = xScale;
let xAxis;
let yAxis;
let svg;
let zoom;
let canvas = null;
const limits = {
  maxY: null,
  minY: null,
  maxX: null,
  minX: null,
};

let createLine;

let keydownFired = 0;

const bindArrowKeys = () => {
  $(document).keydown((e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') {
      return;
    }

    const dis = e.key === 'ArrowLeft' ? 100 : -100;
    if (keydownFired === 0) {
      svg.transition()
        .duration(200)
        .ease(d3.easeCubicInOut)
        .call(zoom.translateBy, dis, 0);
    } else if (new Date().getTime() - 400 > keydownFired) {
      // wait for 2x the transition time to start continuous scrolling
      zoom.translateBy(svg, dis / 20, 0);
    }

    if (keydownFired === 0) {
      keydownFired = new Date().getTime();
    }
  });

  $(document).keyup(() => {
    keydownFired = 0;
  });
};

const drawGridLines = () => {
  d3.selectAll('.axis--y > g.tick > line')
    .attr('x2', width);
};

const rescaleY = () => {
  const minX = currentXScale.invert(0);
  const maxX = currentXScale.invert(width);

  const eMaxY = d3.max(tickerData.btc, (d) => {
    if (d.date >= limits.minX && d.date <= limits.maxX &&
      d.date >= minX && d.date <= maxX) {
      return d.price;
    }
    return 1;
  });
  limits.maxY = eMaxY;
  limits.minY = 0;

  yScale = d3.scaleLinear()
    .domain([limits.maxY * 1.1, limits.minY - (limits.minY * 0.1)])
    .range([0, height]);
};

const zoomed = (gX, gY) => {
  const { transform } = d3.event;
  transform.x = Math.min(0, Math.max(transform.x, width * (1 - transform.k)));
  zoom.transform.x = transform.x;
  gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
  currentXScale = d3.event.transform.rescaleX(xScale);
  gY.call(yAxis.scale(yScale));
  rescaleY(tickerData.btc);
  createLine.x(d => currentXScale(new Date(d.date)));
  createLine.y(d => yScale(d.price));
  canvas.selectAll('path.line')
    .datum(tickerData.btc)
    .attr('d', createLine)
    .attr('clip-path', 'url(#clip)');
  drawGridLines();
  canvas.selectAll('.dot')
    .data(eventData)
    .attr('cx', d => currentXScale(new Date(d.date)));
};

const findData = (ticker, date) => {
  for (let i = 0; i < tickerData[ticker].length; i += 1) {
    if (date < tickerData[ticker][i].date) {
      return tickerData[ticker][i];
    }
  }
  return tickerData[ticker][tickerData[ticker].length - 1];
};

const mousemove = () => {
  const mousex = d3.mouse(canvas.node())[0];
  const mouseDate = currentXScale.invert(mousex);
  canvas.selectAll('.vertical-line-text').remove();
  canvas.selectAll('.vertical-line').remove();

  const d = findData('btc', mouseDate);
  if (d === null) {
    return;
  }
  const xpos = currentXScale(d.date);
  if (xpos < 0 || xpos > width) {
    return;
  }

  canvas.append('text')
    .attr('class', 'vertical-line-text small text-btc')
    .text(`1 BTC = $${d.price.toFixed(2)}`)
    .attr('transform', `translate(${xpos + 5}, ${vlineTextTop})`);
  canvas.append('text')
    .attr('class', 'vertical-line-text small text-eth')
    .text(`1 ETH = $${findData('eth', d.date).price}`)
    .attr('transform', `translate(${xpos + 5}, ${vlineTextTop + vlineTextOffset})`);
  canvas.append('text')
    .attr('class', 'vertical-line-text small text-ltc')
    .text(`1 LTC = $${findData('ltc', d.date).price}`)
    .attr('transform', `translate(${xpos + 5}, ${vlineTextTop + vlineTextOffset + vlineTextOffset})`);
  canvas.append('line')
    .classed('vertical-line', true)
    .attr('width', '1')
    .attr('x1', xpos)
    .attr('y1', 0)
    .attr('x2', xpos)
    .attr('y2', height + timelineTop);

  let mouseEvent = null;
  for (let i = 0; i < eventData.length; i += 1) {
    if (eventData[i].date >= currentXScale.invert(mousex - dotFocusedRadius) &&
      eventData[i].date <= currentXScale.invert(mousex + dotFocusedRadius)) {
      mouseEvent = eventData[i];
      break;
    }
  }


  const verticalLineLeft = $('.vertical-line').position().left;
  $('#event-box').css('left', `${verticalLineLeft - 200}px`);

  if (mouseEvent !== null) {
    $('#event-box>.date').text(moment(mouseEvent.date).format('MMM DD, YYYY'));

    $('svg .vertical-line')
      .addClass('active-event')
      .removeClass('active');
    $(`#${mouseEvent.id}`).addClass('active');

    let trendClassName = 'trending-neutral';
    if (mouseEvent.Trend === 'up') {
      trendClassName = 'trending-up text-success';
    } else if (mouseEvent.Trend === 'down') {
      trendClassName = 'trending-down text-danger';
    }

    $('#event-box>.title').html(`
      <div class="d-flex align-items-center">
        ${mouseEvent.Title}
        <i class="ml-1 mdi mdi-24px mdi-${trendClassName}"></i>
      </div>`);
    $('#event-box>.summary').text(mouseEvent.Description);
    $('#event-box>.title').fadeIn();
    $('#event-box>.summary').fadeIn();
  } else {
    $('#event-box>.date').text(moment(d.date).format('MMM DD, YYYY'));

    $('.dot').removeClass('active');
    $('svg .vertical-line')
      .addClass('active')
      .removeClass('active-event');
    $('#event-box>.title').hide();
    $('#event-box>.summary').hide();
  }
};

const initiateCanvas = () => {
  svg = d3.select('#chart-container>svg');
  svg.selectAll('*').remove();

  width = $('#chart-container>svg').width() - margin.left - margin.right;
  height = $('#chart-container>svg').height() - margin.top - margin.bottom;

  canvas = svg
    .append('g')
    .attr('id', 'canvas')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const eMaxX = d3.max(tickerData.btc, d => d.date);
  const eMinX = d3.min(tickerData.btc, d => d.date);

  if (limits.maxX === null) {
    limits.maxX = eMaxX;
  } else if (eMaxX > limits.maxX) {
    limits.maxX = eMaxX;
  }

  if (limits.minX === null) {
    limits.minX = eMinX;
  } else if (eMinX < limits.minX) {
    limits.minX = eMinX;
  }

  xScale = d3.scaleTime()
    .domain([limits.minX, limits.maxX])
    .range([0, width]);
  currentXScale = xScale;
  rescaleY(tickerData.btc, xScale);
  createLine = d3.line().x(d => xScale(d.date)).y(d => yScale(d.price));

  xAxis = d3.axisBottom(xScale).ticks(16);
  yAxis = d3.axisLeft(yScale).ticks(8);

  canvas.append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', width)
    .attr('height', height);

  const gX = canvas.append('g')
    .attr('transform', `translate(0, ${height})`)
    .attr('class', 'axis axis--x')
    .call(xAxis);

  const gY = canvas.append('g').attr('class', 'axis axis--y').call(yAxis);

  canvas
    .append('path')
    .datum(tickerData.btc)
    .classed('line', true)
    .attr('d', createLine)
    .attr('clip-path', 'url(#clip)');

  canvas.append('g')
    .selectAll('dot')
    .data(eventData)
    .enter()
    .append('a')
    .attr('xlink:href', d => d.Link)
    .append('circle')
    .attr('id', d => d.id)
    .attr('class', 'dot')
    .attr('r', 5)
    .attr('cx', d => xScale(new Date(d.date)))
    .attr('cy', height + timelineTop + dotRadius);

  canvas.append('line')
    .attr('x1', 0)
    .attr('y1', height + timelineTop)
    .attr('x2', width)
    .attr('y2', height + timelineTop)
    .classed('timeline', true);

  canvas.append('line')
    .attr('x1', 0)
    .attr('y1', height + timelineTop + timelineHeight)
    .attr('x2', width)
    .attr('y2', height + timelineTop + timelineHeight)
    .classed('timeline', true);

  canvas.append('g')
    .attr(
      'transform',
      `translate(-50,${height / 2}) rotate(270)`,
    ).append('text')
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('Price (USD)');
  zoom = d3.zoom().on('zoom', () => zoomed(gX, gY, eventData));
  zoom = d3.zoom().scaleExtent([1, 9]);

  zoom.on('zoom', () => zoomed(gX, gY, eventData));

  svg.on('mousemove', mousemove);
  svg.call(zoom);
  drawGridLines();
};

$(document).ready(() => {
  let loaded = 0;
  const coinTickers = ['eth', 'ltc'];
  const loadData = () => {
    loaded += 1;
    if (loaded === coinTickers.length + 2) {
      initiateCanvas();
      bindArrowKeys();
    }
  };

  coinTickers.forEach((ticker) => {
    d3.csv(`data/${ticker}.csv`, (error, data) => {
      const data2 = data.map(d => ({
        date: new Date(d.date),
        price: parseFloat(d['price(USD)'], 10),
      }));
      tickerData[ticker] = _.sortBy(data2, ['date']);
      loadData();
    });
  });

  d3.csv('data/market-price.csv', (error, data) => {
    const data2 = data.map((d) => {
      const newd = _.clone(d);
      newd.date = new Date(newd.date);
      newd.price = parseFloat(newd.price);
      return newd;
    });
    tickerData.btc = _.sortBy(data2, ['date']);
    loadData();
  });

  d3.csv('data/events-timeline.csv', (error, data) => {
    const data2 = data.map((d, i) => {
      const newe = _.clone(d);
      newe.date = new Date(newe.Date);
      newe.Date = undefined;
      newe.id = `event-${i}`;
      return newe;
    });
    eventData = _.sortBy(data2, ['Date']);
    loadData();
  });
});

$(window).resize(() => {
  initiateCanvas();
});
