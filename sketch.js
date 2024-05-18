// Maze Generator and Solver by Tony Guizar
//
// Inspiration for maze generation:
// https://weblog.jamisbuck.org/2010/12/27/maze-generation-recursive-backtracking
//

// vars and setup ---------------------------------------------------------------

let cols, rows;
let grid = [];
let stack = [];
let start, end;
let startLabel, endLabel;
let resetButton, pathfindingButton;
let oscMaze; // oscillator for maze generation
let oscPath; // oscillator for pathfinding
let current;

let w = 40; // cell width
let scalar = 10;

// flags
let settingStart = true;
let startSet = false;
let endSet = false;
let generationStarted = false;
let path = []; // path from start to end
let pathIndex = 0;
let pathInProgress = false;
let isMuted = false;
let usingRandom = false; // flag to check if random maze is being used

function setup() {
  getAudioContext().suspend();
  createCanvas(600, 600);
  cols = floor(width / w);
  rows = floor(height / w);

  initializeGrid();

  // create a div element
  let buttonDiv = createDiv();
  buttonDiv.class("buttonDiv");

  // button to reset
  resetButton = createButton("Reset Grid");
  resetButton.mousePressed(resetGrid);
  styleButton(resetButton, color(100, 0, 100), false);

  // button to show path
  pathfindingButton = createButton("Show Path");
  pathfindingButton.mousePressed(showPath);
  pathfindingButton.attribute("disabled", true);
  styleButton(pathfindingButton, "blue", true);

  // mute button
  muteButton = createButton("Mute");
  muteButton.mousePressed(toggleMute);
  styleButton(muteButton, color(250, 140, 0), false); //dark yellow
  muteButton.style("width", "125px");

  // random button
  randomButton = createButton("Random");
  randomButton.mousePressed(randomMaze);
  styleButton(randomButton, "green", false);
  randomButton.style("width", "125px");

  // append buttons to the div
  buttonDiv.child(muteButton);
  buttonDiv.child(randomButton);
  buttonDiv.child(pathfindingButton);
  buttonDiv.child(resetButton);

  // append the div to the document body
  buttonDiv.parent(document.body);

  //size slider
  slider = createSlider(1, 6, 4, 1); // range 1-6, start = 4, step= 1
  slider.input(onSliderChange);
  styleSlider(slider);

  // oscillator
  oscMaze = new p5.Oscillator("sine");
  oscPath = new p5.Oscillator("sine");

  oscMaze.start();
  oscPath.start();

  oscMaze.amp(0);
  oscPath.amp(0);

  frameRate(60);
}

// Update loop -----------------------------------------------------------------

function draw() {
  background(220);
  for (let i = 0; i < grid.length; i++) {
    grid[i].show();
  }

  // color start and end positions
  noStroke();
  if (startSet) start.highlight("green");
  if (endSet) end.highlight("red");

  if (generationStarted) {
    if (stack.length > 0) {
      current = stack[stack.length - 1];
      current.highlight(255);
      //play sound
      let frequency = map(current.i * current.j, 0, cols * rows, 100, 600);
      oscMaze.freq(frequency);
      if (!isMuted)
        oscMaze.amp(0.5, 0.05); // set amplitude with a ramp time if not muted
      else oscMaze.amp(0, 0.05); // ramp down volume if muted
      let next = current.checkNeighbors();

      if (next) {
        next.visited = true;
        stack.push(next);
        current.removeWalls(next);
      } else {
        stack.pop();
      }
    } else {
      //enable show path button on completion
      if (!pathInProgress) {
        // play end sound
        oscMaze.freq(100);
        oscMaze.amp(0, 1);
        if (end) {
          pathfindingButton.removeAttribute("disabled");
          styleButton(pathfindingButton, "blue", false);
        } else if (usingRandom) {
          resetGrid();
          randomMaze();
        }
      }
    }
  }
  // iteratively draw path from start to end
  if (path.length > 0) {
    if (pathIndex < path.length) {
      path[pathIndex].isPath = true;
      pathIndex++;

      let frequency = map(pathIndex, 0, path.length, 200, 600);
      oscPath.freq(frequency);
      if (!isMuted)
        oscPath.amp(0.5, 0.05); // set amplitude with a ramp time if not muted
      else oscPath.amp(0, 0.05); // ramp down volume if muted
    } else {
      if (pathInProgress) {
        pathInProgress = false;
        oscPath.freq(100); //play end sound
        oscPath.amp(0, 1); // ram down volume
      }
    }
  }

  styleSlider(slider); // update slider position
}

// Helper functions -------------------------------------------------------------

function randomMaze() {
  if (usingRandom) {
    // stop random generation
    styleButton(randomButton, "green", false);
    randomButton.html("Random");
    usingRandom = false;
    if (current != end) end = current;
    endSet = true;
    stack = [];
    return;
  }

  // start random generation
  resetGrid();
  start = grid[floor(random(0, grid.length))];
  //end = grid[grid.length - 1];
  startSet = true;
  //endSet = true;
  stack.push(start);
  generationStarted = true;
  usingRandom = true;
  styleButton(randomButton, "red", false);
  randomButton.html("Stop");
}

function showPath() {
  if (pathInProgress) {
    return;
  }

  clearPath();
  pathInProgress = true;

  pathfindingButton.attribute("disabled", true);
  styleButton(pathfindingButton, "blue", true);

  path = aStar(start, end);
}

function clearPath() {
  for (let i = 0; i < path.length; i++) {
    path[i].isPath = false;
  }
  pathIndex = 0;
}

function index(i, j) {
  if (i < 0 || j < 0 || i >= cols || j >= rows) {
    return -1;
  }
  return i + j * cols;
}

function initializeGrid() {
  grid = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let cell = new Cell(i, j);
      grid.push(cell);
    }
  }
}

function resetGrid() {
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      let cell = grid[index(i, j)];
      cell.walls = [true, true, true, true];
      cell.visited = false;
      cell.g = 0;
      cell.h = 0;
      cell.f = 0;
      cell.parent = false;
      cell.isPath = false;
    }
  }
  pathfindingButton.attribute("disabled", true);
  styleButton(pathfindingButton, "blue", true);
  stack = [];
  path = [];
  pathIndex = 0;
  pathInProgress = false;
  generationStarted = false;
  startSet = false;
  endSet = false;
  start = null;
  end = null;
  usingRandom = false;
  randomButton.html("Random");
  styleButton(randomButton, "green", false);
  oscMaze.freq(100);
  oscMaze.amp(0, 0.5);
  oscPath.freq(100);
  oscPath.amp(0, 0.5);
}

function onSliderChange() {
  resetGrid();
  w = slider.value() * scalar;
  cols = floor(width / w);
  rows = floor(height / w);
  initializeGrid();
}

function toggleMute() {
  isMuted = !isMuted;
  if (isMuted) {
    muteButton.html("Unmute");
  } else {
    muteButton.html("Mute");
  }
}

// style functions -------------------------------------------------------------------

function styleButton(btn, col, disabled) {
  btn.style("font-size", "24px");
  btn.style("padding", "10px 20px");
  btn.style("color", "white");
  btn.style("border", "none");
  btn.style("border-radius", "5px");
  btn.style("margin", "10px");

  let currentColor = col;
  if (disabled) currentColor = decreaseAlpha(col, 225);
  btn.style("background-color", currentColor);

  btn.mouseOver(() => {
    btn.style("transform", "scale(1.05)");
  });

  btn.mouseOut(() => {
    btn.style("transform", "scale(1)");
  });
}

function decreaseAlpha(col, amount) {
  let r = red(col);
  let g = green(col);
  let b = blue(col);
  let a = alpha(col);

  a = constrain(a - amount, 0, 255);

  return color(r, g, b, a);
}

function styleSlider(slider) {
  //remove old labels
  if (startLabel) startLabel.remove();
  if (endLabel) endLabel.remove();
  // add new labels
  startLabel = createP("Hard");
  startLabel.style("font-size", "20px");
  endLabel = createP("Easy");
  endLabel.style("font-size", "20px");
  // label positions
  const sliderPos = slider.position();
  startLabel.position(sliderPos.x - 60, sliderPos.y + 45);
  endLabel.position(sliderPos.x + slider.width + 20, sliderPos.y + 45);
  // style slider
  slider.style("width", "400px");
  slider.style("height", "50px");
}

// Cell structure -------------------------------------------------------------

function Cell(i, j) {
  this.i = i;
  this.j = j;
  this.walls = [true, true, true, true]; // top, right, bottom, left
  this.visited = false;

  this.show = function () {
    let x = this.i * w;
    let y = this.j * w;
    stroke(0);
    strokeWeight(w / 40);
    if (this.walls[0]) {
      line(x, y, x + w, y);
    }
    if (this.walls[1]) {
      line(x + w, y, x + w, y + w);
    }
    if (this.walls[2]) {
      line(x + w, y + w, x, y + w);
    }
    if (this.walls[3]) {
      line(x, y + w, x, y);
    }

    if (this.visited) {
      noStroke();
      fill(255, 0, 255, 100);
      rect(x, y, w, w);
    }

    if (this.isPath) {
      noStroke();
      fill(50, 0, 120, 100);
      rect(x, y, w, w);
    }
  };

  this.highlight = function (color) {
    let x = this.i * w;
    let y = this.j * w;
    noStroke();
    fill(color);
    rect(x, y, w, w);
  };

  this.checkNeighbors = function () {
    let neighbors = [];

    let top = grid[index(i, j - 1)];
    let right = grid[index(i + 1, j)];
    let bottom = grid[index(i, j + 1)];
    let left = grid[index(i - 1, j)];

    if (top && !top.visited) {
      neighbors.push(top);
    }
    if (right && !right.visited) {
      neighbors.push(right);
    }
    if (bottom && !bottom.visited) {
      neighbors.push(bottom);
    }
    if (left && !left.visited) {
      neighbors.push(left);
    }

    if (neighbors.length > 0) {
      let r = floor(random(0, neighbors.length));
      return neighbors[r];
    } else {
      return undefined;
    }
  };

  this.removeWalls = function (next) {
    let x = this.i - next.i;
    if (x === 1) {
      this.walls[3] = false;
      next.walls[1] = false;
    } else if (x === -1) {
      this.walls[1] = false;
      next.walls[3] = false;
    }
    let y = this.j - next.j;
    if (y === 1) {
      this.walls[0] = false;
      next.walls[2] = false;
    } else if (y === -1) {
      this.walls[2] = false;
      next.walls[0] = false;
    }
  };

  // pathfinding properties
  this.g = 0;
  this.h = 0;
  this.f = 0;
  this.parent = null;
  this.isPath = false;

  this.heuristic = function (goal) {
    return abs(this.i - goal.i) + abs(this.j - goal.j);
  };

  this.getNeighbors = function () {
    let neighbors = [];

    let top = grid[index(this.i, this.j - 1)];
    let right = grid[index(this.i + 1, this.j)];
    let bottom = grid[index(this.i, this.j + 1)];
    let left = grid[index(this.i - 1, this.j)];

    if (top && !this.walls[0] && !top.walls[2]) {
      neighbors.push(top);
    }
    if (right && !this.walls[1] && !right.walls[3]) {
      neighbors.push(right);
    }
    if (bottom && !this.walls[2] && !bottom.walls[0]) {
      neighbors.push(bottom);
    }
    if (left && !this.walls[3] && !left.walls[1]) {
      neighbors.push(left);
    }

    return neighbors;
  };
}

// A* pathfinding ---------------------------------------------------------------

function aStar(start, goal) {
  let openSet = [];
  let closedSet = [];

  openSet.push(start);

  while (openSet.length > 0) {
    // find the cell with the lowest f score
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    let currentCell = openSet[lowestIndex];

    // reached the end, reconstruct the path
    if (currentCell === goal) {
      let pathFound = [];
      let temp = currentCell;
      while (temp) {
        pathFound.push(temp);
        temp = temp.parent;
      }
      return pathFound.reverse();
    }

    openSet.splice(lowestIndex, 1);
    closedSet.push(currentCell);

    let neighbors = currentCell.getNeighbors();

    for (let neighbor of neighbors) {
      if (!closedSet.includes(neighbor)) {
        let tempG = currentCell.g + 1;

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tempG >= neighbor.g) {
          continue;
        }

        neighbor.g = tempG;
        neighbor.h = neighbor.heuristic(goal);
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = currentCell;
      }
    }
  }
}

// Mouse click event -------------------------------------------------------------

function mousePressed() {
  userStartAudio();
  if (generationStarted || usingRandom) return;

  let i = floor(mouseX / w);
  let j = floor(mouseY / w);
  let cellIndex = index(i, j);

  // if cell clicked is in bounds
  if (cellIndex !== -1) {
    // set start if not done
    if (settingStart) {
      start = grid[cellIndex];
      startSet = true;
      settingStart = false;
      // otherwise set end, and check its not the same cell
    } else if (grid[cellIndex] !== start) {
      end = grid[cellIndex];
      endSet = true;
      settingStart = true;
    }

    // start maze generation once start and end are set
    if (startSet && endSet) {
      start.visited = true;
      stack.push(start);
      generationStarted = true;
    }
  }
}
