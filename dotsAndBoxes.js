// Define constants
const LINE_COLORS = ["#3e67cf", "#e32605", "#3cb371", "#ffb600"]
const FILL_COLORS = ["#6495ed", "#ff4929", "#2fda3a", "#ffd700"]
const LIGHT_COLORS = ["#95bafc", "#ff7b63", "#75eb7c", "#ffe970"]

const GRID_WIDTH = 0.5
const GRID_HEIGHT = 0.75
const DOT_RADIUS = 0.08
const THINKING_TIME = 700

const BACKGROUND_COLOR = "white"
const DOT_COLOR = "black"
const LINE_HIGHLIGHT_COLOR = "#dbdbdb"


function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}


function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array
}


function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke == "undefined" ) {
        stroke = true;
    }
    if (typeof radius === "undefined") {
        radius = 5;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    if (stroke) {
        ctx.strokeStyle = stroke
        ctx.stroke()
    }
    if (fill) {
        ctx.fillStyle = fill
        ctx.fill()
    }        
}

function delay(delayInms) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(2);
      }, delayInms);
    });
  }


class DotsAndBoxes {
    constructor(players, gridSize, noPowerups, computerDifficuly) {
        // Define constants
        this.PLAYERS = players
        this.GRID_SIZE = gridSize
        this.NO_POWERUPS = noPowerups
        this.COMPUTER_DIFFICULTY = computerDifficuly

        // Get canvas
        this.canvas = document.querySelector("canvas")
        this.ctx = this.canvas.getContext("2d")

        // Define attributes
        this.cursorX = 0
        this.cursorY = 0
        this.lineX = null
        this.lineY = null
        this.playerTurn = 0
        this.displayedWinner = false
        this.pauseGame = false
        this.winners = []
        this.hoverCondition = "this.cleanRow[j].owner == null"
        this.mode = "normal"
        this.oneMoreMove = false
        this.homeScreen = false
        this.calc_square_size()
    }

    get_player_color(name) {
        for (let n=0; n < this.PLAYERS.length; n++) {
            if (this.PLAYERS[n].name == name) {
                return n
            }
        }
    }

    calc_square_size() {
        let estimateColumnSpace = Math.floor(this.canvas.width*GRID_WIDTH / this.GRID_SIZE.columns)
        let estimateRowSpace = Math.floor(this.canvas.height*GRID_HEIGHT / this.GRID_SIZE.rows)
        this.squareSize = Math.min(estimateColumnSpace, estimateRowSpace)
    }

    calc_font_size(text, defaultSize, boxHeight, maxWidth) {
        // Make sure name fits in box
        for (let fontSize=defaultSize; fontSize > 0; fontSize -= 0.01 ) {
            this.ctx.font = `${boxHeight*fontSize}px Arial`
            if (this.ctx.measureText(text).width < maxWidth) {
                return fontSize
            }
        }
    }

    run_bomb (i, j) {
        for (let a=-2; a<=2; a++) {
            for (let b=-2; b<=2; b++) {
                try {
                    this.gridValues[i+a][j+b].owner = null
                } catch {
                    // Pass
                }
            }
        }
        // Bomb has exploded
        this.gridValues[i][j].powerup = null

        this.next_turn()
    }

    run_switch () {
        // Swap players scores
        for (let i=0; i < this.GRID_SIZE.rows*2+1; i ++) {
            for (let j=0; j < this.GRID_SIZE.columns*2+1; j++) {
                // Only for filled in lines and squares
                if (this.gridValues[i][j].type != "dot" && this.gridValues[i][j].owner != null) {

                    // Calculate who the new square belongs to
                    this.n = this.get_player_color(this.gridValues[i][j].owner) + 1
                    if (this.n >= this.PLAYERS.length) {
                        this.n = 0
                    }

                    // Change ownership
                    this.gridValues[i][j].owner = this.PLAYERS[this.n].name
                }
            }
        }
        
        this.next_turn()
    }

    run_spray(i, j, type) {
        // Makes horizontal tiles your colour

        if (type == "horizontal") {
            for (let b=0; b<=2*this.GRID_SIZE.columns; b++) {
                if (this.gridValues[i][b].type == "square" && ((this.gridValues[i][b].powerup == null) ||
                (["horizontal spray", "vertical spray"].includes(this.gridValues[i][b].powerup) &&
                (this.gridValues[i][b].owner != null)))){
                    // Player gets square
                    this.gridValues[i][b].owner = this.PLAYERS[this.playerTurn].name
    
                    // Fill up lines
                    if (this.gridValues[i+1][b].owner == null) {
                        this.gridValues[i+1][b].owner = this.PLAYERS[this.playerTurn].name
                    }
                    if (this.gridValues[i-1][b].owner == null) {
                        this.gridValues[i-1][b].owner = this.PLAYERS[this.playerTurn].name
                    }
                    if (this.gridValues[i][b+1].owner == null) {
                        this.gridValues[i][b+1].owner = this.PLAYERS[this.playerTurn].name
                    }
                    if (this.gridValues[i][b-1].owner == null) {
                        this.gridValues[i][b-1].owner = this.PLAYERS[this.playerTurn].name
                    }
                }           
            }

        } else if (type == "vertical") {
            for (let a=0; a<=2*this.GRID_SIZE.rows; a++) {
                if (this.gridValues[a][j].type == "square" && ((this.gridValues[a][j].powerup == null) ||
                (["horizontal spray", "vertical spray"].includes(this.gridValues[a][j].powerup) &&
                (this.gridValues[a][j].owner != null)))){
                    // Player gets square
                    this.gridValues[a][j].owner = this.PLAYERS[this.playerTurn].name
    
                    // Fill up lines
                    if (this.gridValues[a-1][j].owner == null) {
                        this.gridValues[a-1][j].owner = this.PLAYERS[this.playerTurn].name
                    }
                    if (this.gridValues[a+1][j].owner == null) {
                        this.gridValues[a+1][j].owner = this.PLAYERS[this.playerTurn].name
                    }
                    if (this.gridValues[a][j-1].owner == null) {
                        this.gridValues[a][j-1].owner = this.PLAYERS[this.playerTurn].name
                    }
                    if (this.gridValues[a][j+1].owner == null) {
                        this.gridValues[a][j+1].owner = this.PLAYERS[this.playerTurn].name
                    }
                }           
            }
        }
        
    }

    run_eraser() {
        // Erases selected line
        if (this.lineX != null) {
            // If blank line is hovered
            this.gridValues[this.lineY][this.lineX].owner = null
            this.hoverCondition = "this.cleanRow[j].owner == null"

            this.cursorX = 0
            this.cursorY = 0
            this.lineX = null
            this.lineY = null

            this.calculate_valid_squares()
            this.draw_grid()
        }
    }

    determine_best_erase(moves) {
        let i, j, a, b, score
        let bestMove = {"move": moves[0], "score": -999}
        let adjacent = [[0, 1], [0, -1], [1, 0], [-1, 0]]

        for (let move of moves) {
            [i, j] = move // Unpack value
            score = 0

            for (let item of adjacent) {
                [a, b] = item
                // Check owner of the squares the line is part of
                try {
                    if (this.gridValues[i+a][j+b].type == "square") {
                        if (this.gridValues[i+a][j+b].owner == this.PLAYERS[this.playerTurn].name) {
                            score -= 1
                        } else if (this.gridValues[i+a][j+b].owner != null) {
                            score += 1
                        }  
                    }
                } catch {
                    // Pass
                }
                              
            }

            if (score > bestMove.score) {
                // Update best move
                bestMove.move = move
                bestMove.score = score
            }
        }

        return bestMove.move
    }

    calculate_valid_squares() {
        for (let i=0; i < this.GRID_SIZE.rows*2+1; i ++) {
            for (let j=0; j < this.GRID_SIZE.columns*2+1; j++) {
                if (this.gridValues[i][j].type == "square") {
                    // Check if square is valid
                    if (this.gridValues[i+1][j].owner == null || this.gridValues[i-1][j].owner == null ||
                        this.gridValues[i][j+1].owner == null || this.gridValues[i][j-1].owner == null) {
                        // Square invalid
                        this.gridValues[i][j].owner = null
                    }
                }
            }
        }
    }

    calculate_potential_squares() {
        let a, b
        let normalMoves = [null]
        let eraseMoves = []
        let sprayMoves = []
        let edges = []

        for (let i=0; i < this.GRID_SIZE.rows*2+1; i ++) {
            for (let j=0; j < this.GRID_SIZE.columns*2+1; j++) {
    
                if (this.gridValues[i][j].type == "square") {
                    // Get the owners of all the lines that make up the square
                    edges = [this.gridValues[i+1][j].owner, this.gridValues[i-1][j].owner,
                    this.gridValues[i][j+1].owner, this.gridValues[i][j-1].owner]

                    // Check if only one edge is missing
                    if (edges.filter(x => x == null).length == 1) {
                        [a, b] = [[1, 0], [-1, 0], [0, 1], [0, -1]][edges.findIndex((item) => item == null)]
                        
                        switch (this.gridValues[i][j].powerup) {
                            case "horizontal spray":
                                sprayMoves.push([i+a, j+b]) 
                                break
                            case "vertical spray":
                                sprayMoves.push([i+a, j+b])
                                break
                            case "eraser":
                                eraseMoves.push([i+a, j+b])
                                break
                            default:
                                normalMoves.push([i+a, j+b])
                                break
                        }
                    }
                }
            }
        }

        // Shuffle moves
        normalMoves = shuffle(normalMoves)
        eraseMoves = shuffle(eraseMoves)
        sprayMoves = shuffle(sprayMoves)

        return sprayMoves.concat(eraseMoves, normalMoves)[0]
    }

    generate_powerup() {
        let spawnSquares = this.blankSquares
        for (let powerup in this.NO_POWERUPS) {
            if (powerup == "bomb") {
                // Bombs cannot spawn on edges
                spawnSquares = this.blankSquares.filter((item) => !(1 == item[0] || item[0] == 2*(this.GRID_SIZE.rows-1)+1 // Must match row
                || 1 == item[1] || item[1] == 2*(this.GRID_SIZE.columns-1)+1))
            }

            for (let n=0; n<this.NO_POWERUPS[powerup]; n++) {
                if (spawnSquares.length > 0) {
                    this.coordinate = spawnSquares.pop()
                    this.gridValues[this.coordinate[0]][this.coordinate[1]].powerup = powerup
                } else {
                    this.coordinate = this.blankSquares.pop()
                    this.gridValues[this.coordinate[0]][this.coordinate[1]].powerup = powerup
                }
            }
        }
    }

    async next_turn() {
        // Next player's turn
        this.playerTurn += 1
        if (this.playerTurn >= this.PLAYERS.length) {
            this.playerTurn = 0
        }

        if (this.PLAYERS[this.playerTurn].type == "computer") {
            // Computer's turn
            this.delay = await delay(THINKING_TIME)
            this.computer_turn()
        }
        this.draw_grid()
    }

    async computer_turn() {
        // Calculate the best move for a computer
        // Generate lines
        this.moves = []

        if (this.mode == "erase") {
            for (let i=0; i < this.GRID_SIZE.rows*2+1; i ++) {
                for (let j=0; j < this.GRID_SIZE.columns*2+1; j++) {
                    if (this.gridValues[i][j].type == "line" && this.gridValues[i][j].owner != null) {
                        this.moves.push([i, j])
                    }
                }
            }

            // Choose line to erase
            let chosenLine = null
            if (Math.random() < this.COMPUTER_DIFFICULTY) {
                chosenLine = this.determine_best_erase(this.moves)
            } else {
                // Choose random line
                chosenLine = shuffle(this.moves).pop()
            }
            
            this.gridValues[chosenLine[0]][chosenLine[1]].owner = null
            this.calculate_valid_squares()

        } else {
            for (let i=0; i < this.GRID_SIZE.rows*2+1; i ++) {
                for (let j=0; j < this.GRID_SIZE.columns*2+1; j++) {
                    if (this.gridValues[i][j].type == "line" && this.gridValues[i][j].owner == null) {
                        this.moves.push([i, j])
                    }
                }
            }

            // Choose line
            let chosenLine = null
            if (Math.random() < this.COMPUTER_DIFFICULTY) {
                // Work out potential squares
                chosenLine = this.calculate_potential_squares()
            }

            // If no line has been chosen yet
            if (chosenLine == null) {
                // Then prevent creating potential squares
                let i, j, a, b
                for (let line of this.moves) {
                    [i, j] = line

                    for (let n=0; n<4; n++) {
                        [a, b] = [[1, 0], [-1, 0], [0, 1], [0, -1]][n]
                        try {
                            if (this.gridValues[i+a][j+b].type == "square") {
                                // Work out how many edges does it have
                                this.edges = [this.gridValues[i+a+1][j+b].owner, this.gridValues[i+a-1][j+b].owner,
                                this.gridValues[i+a][j+b+1].owner, this.gridValues[i+a][j+b-1].owner]
    
                                if ((this.edges.filter(x => x != null).length == 2) && (this.moves.length > 1)) {
                                    // If there are already two edges in the box
                                    this.moves = this.moves.filter((item) => item != line)
                                }
                            }
                        } catch {
                            // Pass
                        }
                    }
                }

                // Choose a random line
                chosenLine = shuffle(this.moves).pop()
            }
            
            this.gridValues[chosenLine[0]][chosenLine[1]].owner = this.PLAYERS[this.playerTurn].name
            this.oneMoreMove = false
        }

        this.draw_grid()

        if (!this.calculate_square() && !this.oneMoreMove) {
            this.next_turn()
        } else {
            // Make another move
            this.delay = await delay(THINKING_TIME)
            this.computer_turn()
        }
    }

    draw_scores() {
        // Define values
        const BOX_WIDTH = 0.2
        const BOX_HEIGHT = 0.25
        const PADY = 0.1
        const NAME_WIDTH = 0.45

        for (let i=0; i<this.scores.length; i++) {
            // Calculate position based on number
            if (i % 2 == 0) {
                this.x = this.canvas.width*(GRID_WIDTH/2-BOX_WIDTH)/2
            } else {
                this.x = this.canvas.width*(1 - ((GRID_WIDTH/2-BOX_WIDTH)/2) - BOX_WIDTH)
            }
            if (i < 2) {
                this.y = this.canvas.height*PADY
            } else {
                this.y = this.canvas.height*(1-PADY-BOX_HEIGHT)
            }

            this.width = this.canvas.width*BOX_WIDTH
            this.height = this.canvas.height*GRID_HEIGHT*BOX_HEIGHT

            this.ctx.lineWidth = 10
            if (i == this.playerTurn && this.winners.length == 0) {
                // Highlight box
                this.outlineColor = LIGHT_COLORS[i]
            } else {
                this.outlineColor = LINE_COLORS[i]
            }

            roundRect(this.ctx, this.x, this.y,
                this.width, this.height, 5, FILL_COLORS[i], this.outlineColor)

            // Add name
            this.text = this.scores[i].name
            this.fontSize = this.calc_font_size(this.text, 0.4, this.height, this.width*NAME_WIDTH)
            this.ctx.font = `${this.height*this.fontSize}px Arial`
            this.ctx.fillStyle = "black"

            this.ctx.fillText(this.text,
                this.x + (this.width*0.275) - this.ctx.measureText(this.text).width/2,
                this.y + (this.height*0.4) + this.height*(this.fontSize/3.2))

            // Draw players box
            this.ctx.lineWidth = 4
            this.ctx.strokeStyle = LINE_COLORS[i]
            this.ctx.fillStyle = LIGHT_COLORS[i]
            this.ctx.fillRect(this.x + this.width * 0.55, this.y + this.height * 0.2, this.height * 0.4, this.height * 0.4)
            this.ctx.strokeRect(this.x + this.width * 0.55, this.y + this.height * 0.2, this.height * 0.4, this.height * 0.4)

            // Add player's score
            this.text = this.scores[i].score
            this.fontSize = this.calc_font_size(this.text, 0.3, this.height * 0.2, this.height * 0.2)
            this.ctx.font = `${this.height*this.fontSize}px Arial`
            this.ctx.fillStyle = LINE_COLORS[i]

            this.ctx.fillText(this.text,
                this.x + this.width * 0.55 +  this.height * 0.2 - this.ctx.measureText(this.text).width/2,
                this.y + (this.height*0.4) + this.height*(this.fontSize/3.2))

            // Draw Image
            this.img = document.createElement("img"); // Create image element
            if (this.winners.includes(this.scores[i].name)) {
                this.img.src = `images/${this.scores[i].type} win.png`
            } else {
                this.img.src = `images/${this.scores[i].type}.png`  // Attach image to image object
            }
            
            this.ctx.drawImage(this.img, this.x + 0.75*this.width, this.y + this.height * 0.1,
            this.height * 0.5, this.height * 0.5)

            this.ctx.font = `${this.height*0.3}px Arial`
            this.ctx.fillStyle = "black"

            if (i == this.playerTurn && this.winners.length == 0 && this.hoverCondition == "this.cleanRow[j].owner != null") {
                // Add 'Erase line' text
                this.text = "Erase line"
                this.ctx.fillText(this.text,
                    this.x + (this.width*0.5) - this.ctx.measureText(this.text).width/2,
                    this.y + (this.height*0.8) + this.height*(this.fontSize/3.2))
            } else if (i == this.playerTurn && this.winners.length == 0) {
                // Add 'Your turn' text
                this.text = "Your turn"
                this.ctx.fillText(this.text,
                    this.x + (this.width*0.5) - this.ctx.measureText(this.text).width/2,
                    this.y + (this.height*0.8) + this.height*(this.fontSize/3.2))

            } else if (this.winners.includes(this.scores[i].name)) {
                this.text = "Winner!"
                this.ctx.fillText(this.text,
                    this.x + (this.width*0.5) - this.ctx.measureText(this.text).width/2,
                    this.y + (this.height*0.8) + this.height*(this.fontSize/3.2))
            }
        }
    }

    draw_hover_line () {
        // If cursor is hovering over line, then draw it
        // Calculate whether user is hovering over horizontal line
        this.ctx.lineWidth = this.squareSize*DOT_RADIUS
        this.lineX = null
        this.lineY = null
        this.isHovering = false

        for (let i=0; i <= this.GRID_SIZE.rows; i++) {
            this.cleanRow = this.gridValues[i*2].filter((item) => item.type == "line")
            for (let j=0; j < this.cleanRow.length; j++) {

                if (eval(this.hoverCondition)) {
                    // Check if mouse cursor is in range
                    this.xMin = (this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 + j*this.squareSize
                    this.xMax = this.xMin + this.squareSize

                    this.yMin = (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + i*this.squareSize - this.squareSize*DOT_RADIUS*2
                    this.yMax = (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + i*this.squareSize + this.squareSize*DOT_RADIUS*2
                    if (this.xMin < this.cursorX && this.cursorX < this.xMax && this.yMin < this.cursorY && this.cursorY < this.yMax) {
                        // Draw line

                        this.ctx.strokeStyle = LINE_HIGHLIGHT_COLOR
                        this.ctx.beginPath()
                        this.ctx.moveTo(this.xMin, this.yMin + this.squareSize*DOT_RADIUS*2)
                        this.ctx.lineTo(this.xMax, this.yMin + this.squareSize*DOT_RADIUS*2)   
                        this.ctx.stroke()

                        this.lineX = j*2 + 1
                        this.lineY = i*2
                        this.isHovering = true
                    }

                }
            }
        }

        // Calculate whether user is hovering over vertical line
        for (let i=0; i < this.GRID_SIZE.rows; i++) {
            this.cleanRow = this.gridValues[i*2+1].filter((item) => item.type == "line") 
            for (let j=0; j < this.cleanRow.length; j++) {
                if (eval(this.hoverCondition)) {
                    // Check if mouse cursor is in range
                    this.xMin = (this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 +
                    j*this.squareSize - this.squareSize*DOT_RADIUS*2

                    this.xMax = (this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 +
                    j*this.squareSize + this.squareSize*DOT_RADIUS*2
    
                    this.yMin = (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + i*this.squareSize
                    this.yMax = this.yMin + this.squareSize
                    if (this.xMin < this.cursorX && this.cursorX < this.xMax &&
                        this.yMin < this.cursorY && this.cursorY < this.yMax && !this.isHovering) {
                        // Draw line
                        this.ctx.strokeStyle = LINE_HIGHLIGHT_COLOR
                        this.ctx.beginPath()
                        this.ctx.moveTo(this.xMin + this.squareSize*DOT_RADIUS*2, this.yMin)
                        this.ctx.lineTo(this.xMin + this.squareSize*DOT_RADIUS*2, this.yMax)   
                        this.ctx.stroke()

                        this.lineX = j*2
                        this.lineY = i*2 + 1

                    }
                }
            }
        }
    }

    draw_grid() {
        // Clean grid
        this.ctx.fillStyle = BACKGROUND_COLOR
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // Draw filled in squares
        this.ctx.font = `${Math.floor(this.squareSize*0.8)}px Arial` // Set font

        // Reset scores
        this.totalScore = 0
        this.scores = this.PLAYERS
        for (let i=0; i < this.scores.length; i++) {
            this.scores[i].score= 0
        }

        for (let i=1; i < this.gridValues.length; i += 2) {
            for (let j=1; j < this.gridValues[i].length; j += 2) {
                if (this.gridValues[i][j].powerup != null) {
                    // Draw powerup on square
                    this.img = document.createElement("img"); // 
                    this.img.src = `images/${this.gridValues[i][j].powerup}.png`

                    this.x = (this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 + ((j-1)/2)*this.squareSize
                    this.y = (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + ((i-1)/2)*this.squareSize
                    this.ctx.drawImage(this.img, this.x, this.y, this.squareSize, this.squareSize)
                }

                if (this.gridValues[i][j].owner != null) {
                    // Get owner's colour
                    this.ctx.fillStyle = FILL_COLORS[this.get_player_color(this.gridValues[i][j].owner)]

                    // Draw square
                    this.x = (this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 + ((j-1)/2)*this.squareSize
                    this.y = (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + ((i-1)/2)*this.squareSize
                    this.ctx.fillRect(this.x, this.y, this.squareSize, this.squareSize)

                    // Add owner's inital
                    this.ctx.fillStyle = LINE_COLORS[this.get_player_color(this.gridValues[i][j].owner)]
                    this.text = this.gridValues[i][j].owner[0]
                    this.ctx.fillText(this.text,
                        this.x+this.squareSize/2 - this.ctx.measureText(this.text).width/2,
                        this.y+this.squareSize/2 + Math.floor(this.squareSize*0.25))

                    // Increase score by 1
                    this.scores[this.get_player_color(this.gridValues[i][j].owner)].score += 1
                    this.totalScore += 1

                    if ((this.totalScore >= this.GRID_SIZE.rows * this.GRID_SIZE.columns) && (!this.displayedWinner)) {
                        // All the squares have been taken
                        let topScore = Math.max(...this.scores.map(player => player.score))
                        this.winners = []
                        for (let player of this.scores) {
                            if (player.score == topScore) {
                                this.winners.push(player.name)
                            }
                        }
                        // Display winners
                        let text = null
                        if (this.winners.length == 1) {
                            text = this.winners[0] + " is the winner!"
                        } else {
                            text = "The winners are:"
                            for (let winner of this.winners) {
                                text += "\n• " + winner
                            } 
                        }

                        alert(text)
                        this.displayedWinner = true
                    }

                }
            }
        }

        // Draw player lines
        this.ctx.lineWidth = this.squareSize*DOT_RADIUS
        for (let i=0; i <= this.GRID_SIZE.rows; i++) {
            this.cleanRow = this.gridValues[i*2].filter((item) => item.type == "line")
            for (let j=0; j < this.cleanRow.length; j++) {

                if (this.cleanRow[j].owner != null) {
                    // Draw players line
                    this.ctx.strokeStyle = LINE_COLORS[this.get_player_color(this.cleanRow[j].owner)] 

                    this.xMin = (this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 + j*this.squareSize
                    this.xMax = this.xMin + this.squareSize
                    this.yMin = (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + i*this.squareSize
                    
                    this.ctx.beginPath()
                    this.ctx.moveTo(this.xMin, this.yMin)
                    this.ctx.lineTo(this.xMax, this.yMin)   
                    this.ctx.stroke()
                }
            }
        }

        // Calculate whether user is hovering over vertical line
        for (let i=0; i < this.GRID_SIZE.rows; i++) {
            this.cleanRow = this.gridValues[i*2+1].filter((item) => item.type == "line") 
            for (let j=0; j < this.cleanRow.length; j++) {
                if (this.cleanRow[j].owner != null) {
                    // Draw players line
                    this.ctx.strokeStyle = LINE_COLORS[this.get_player_color(this.cleanRow[j].owner)] 

                    this.xMin = (this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 +
                    j*this.squareSize
    
                    this.yMin = (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + i*this.squareSize
                    this.yMax = this.yMin + this.squareSize
                    
                    this.ctx.beginPath()
                    this.ctx.moveTo(this.xMin, this.yMin)
                    this.ctx.lineTo(this.xMin, this.yMax)   
                    this.ctx.stroke()
                }
            }
        }
        
        if (this.PLAYERS[this.playerTurn].type == "human") {
            this.draw_hover_line()
        }

        // Draw dots
        this.ctx.fillStyle = DOT_COLOR
        for (let x=0; x <= this.GRID_SIZE.columns; x ++) {
            for (let y=0; y <= this.GRID_SIZE.rows; y ++) {
                // Draw circle
                this.ctx.beginPath()
                this.ctx.arc((this.canvas.width-this.squareSize*this.GRID_SIZE.columns)/2 + x*this.squareSize,
                (this.canvas.height-this.squareSize*this.GRID_SIZE.rows)/2 + y*this.squareSize,
                this.squareSize*DOT_RADIUS, 0, 2 * Math.PI)
                this.ctx.fill()
            }
        }

        this.draw_scores()

        // Draw back button
        this.img = document.createElement("img"); // Create image element
        this.x = 0.02*this.canvas.width
        this.y = 0.02*this.canvas.height
        this.size = 0.03*this.canvas.width
        
        if (this.x < this.cursorX && this.cursorX < this.x + this.size && this.y < this.cursorY && this.cursorY < this.y + this.size) {
            this.img.src = "images/back highlighted.png"
            this.pauseGame = true
        } else {
            this.img.src = "images/back.png"
            this.pauseGame = false
        }
        
        this.ctx.drawImage(this.img, this.x, this.y, this.size, this.size)
    }

    draw_line() {
        if (this.lineX != null) {
            // If blank line is hovered
            this.gridValues[this.lineY][this.lineX].owner = this.PLAYERS[this.playerTurn].name
            this.newSquare = this.calculate_square()

            if (!this.newSquare) {
                this.next_turn()
            }

            this.cursorX = 0
            this.cursorY = 0
            this.lineX = null
            this.lineY = null

            this.draw_grid()
        }
        
    }

    calculate_square() {
        // Calculate whether square has been completed
        let newSquare = false
        this.mode = "normal"
        for (let i=1; i < this.gridValues.length; i += 2) {
            for (let j=1; j < this.gridValues[i].length; j += 2) {
                this.square = this.gridValues[i][j]
                
                // Check if square is not filled in yet
                if (this.square.owner == null && this.gridValues[i-1][j].owner != null && this.gridValues[i+1][j].owner != null
                    && this.gridValues[i][j-1].owner != null && this.gridValues[i][j+1].owner != null) {
                        this.square.owner = this.PLAYERS[this.playerTurn].name

                        // Check if square has powerup
                        if (this.square.powerup == "bomb") {
                            // Activate powerup
                            this.run_bomb(i, j)
                        } else if (this.square.powerup == "switch") {
                            this.run_switch()
                        } else if (this.square.powerup == "horizontal spray") {
                            this.run_spray(i, j, "horizontal")
                        } else if (this.square.powerup == "vertical spray") {
                            this.run_spray(i, j, "vertical")
                        } else if (this.square.powerup == "eraser") {
                            
                            if (this.PLAYERS[this.playerTurn].type == "human") {
                                this.hoverCondition = "this.cleanRow[j].owner != null"
                            }
                            this.mode = "erase"
                            this.oneMoreMove = true
                            this.square.powerup = null

                    }
                    newSquare = true
                }
            }
        }
        return newSquare
    }

    play () {
        // Generate grid
        this.gridValues = []
        let row = []

        for (let i=0; i < this.GRID_SIZE.rows*2+1; i ++) {
            row = []

            for (let j=0; j < this.GRID_SIZE.columns*2+1; j++) {
                if (i % 2 == 0) {
                    // Dot row
                    if (j % 2 == 0) {
                        // Add dot
                        row.push({"type":"dot"})
                    } else {
                        // Add line
                        row.push({"type":"line", "owner": null})
                    }

                } else {
                    // Square row
                    if (j % 2 == 0) {
                        // Add line
                        row.push({"type":"line", "owner": null})
                    } else {
                        // Add square
                        row.push({"type":"square", "owner": null, "powerup": null})
                    }
                }
            }
            this.gridValues.push(row)
        }

        // Generate potential powerup squares
        this.blankSquares = []
        for (let i=0; i<this.GRID_SIZE.rows; i++) {
            for (let j=0; j<this.GRID_SIZE.columns; j++) {
                this.blankSquares.push([2*i+1, 2*j+1])
            }
        }
        this.blankSquares = shuffle(this.blankSquares)

        this.generate_powerup()
        this.draw_grid()
    }
}


function play_game(players, gridSize, noPowerups, computerDifficuly) {
    // Clear html body
    let htmlBody = document.querySelector("body")
    htmlBody.innerHTML = `<canvas width="100" height="100" style="touch-action: none"></canvas>`
    htmlBody.style = "width: 100%; height: 100%; margin: 0px; border: 0; overflow: hidden; display: block;"

    // Resize canvas
    canvas = document.querySelector("canvas")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    let game = new DotsAndBoxes(players, gridSize, noPowerups, computerDifficuly)
    game.play()


    // Bind mouse movement
    window.addEventListener("mousemove", event => {  // Add mouse movement event
        game.cursorX = event.pageX
        game.cursorY = event.pageY
        game.draw_grid()
    })

    window.addEventListener("mousedown", event => {  // Add mouse down binding event
        if (game.pauseGame && !game.homeScreen) {
            if (confirm("Are you sure you want to quit?")) {
                // Go back to main menu
                game.homeScreen = true
                htmlBody.innerHTML = getHTML(players, gridSize, noPowerups, computerDifficuly)
                htmlBody.style = CSS
              }
        }
        else if (game.PLAYERS[game.playerTurn].type == "human") {
            if (game.hoverCondition == "this.cleanRow[j].owner == null") {
                game.draw_line()
            } else if (game.hoverCondition == "this.cleanRow[j].owner != null") {
                game.run_eraser()
            }
        }
    })


    // Bind window resize
    window.addEventListener("resize", function(event){
        if (!game.homeScreen) {
            // Resize canvas
            canvas = document.querySelector("canvas")
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight

            // Redraw grid
            game.calc_square_size()
            game.draw_grid()
        }
        
    })
}

function getHTML(players, gridSize, noPowerups, computerDifficuly) {
    // Add missing players
    while (players.length < 4) {
        players.push({"type": "none", "name": `Player ${players.length+1}`})
    }

    // Add radio button properties
    for (let i=0; i<players.length; i++) {
        for (let property of ["human", "computer", "none"]) {
            if (players[i].type == property) {
                players[i][property] = "checked"
            } else {
                players[i][property] = ""
            }
        }
    }

    let difficuly = {0.3: "easy", 0.6: "medium", 0.9: "hard"}[computerDifficuly]
    computerDifficuly = {"easy": "", "medium": "", "hard": ""}
    computerDifficuly[difficuly] = "checked"

    let HTML = `
<img src="images/logo.png" alt="Dots and Boxes Remastered" class="center">
<h1 class="center">By Alexander Shemaly</h1>

<!-- Create player options -->
<table>
    <tr>
        <th id="player1">
            <h2>PLAYER 1</h2>
            Name: <input type="text" name="player1name" value="${players[0].name}" autocomplete="off"><br><br>
            Type: <input type="radio" value="human" name="player1choice" ${players[0].human}>Human
                  <input type="radio" value="computer" name="player1choice" disabled>Computer
                  <input type="radio" value="none" name="player1choice" disabled>None
            <br>
    
        </th>
    
        <th id="player2">
            <h2>PLAYER 2</h2>
            Name: <input type="text" name="player2name" value="${players[1].name}" autocomplete="off"><br><br>
            Type: <input type="radio" value="human" name="player2choice" ${players[1].human}>Human
                  <input type="radio" value="computer" name="player2choice" ${players[1].computer}>Computer <!-- Temp -->
                  <input type="radio" value="none" name="player2choice" disabled>None
            <br>
    
        </th>
    </tr>

    <tr>
        <th id="player3">
            <h2>PLAYER 3</h2>
            Name: <input type="text" name="player3name" value="${players[2].name}" autocomplete="off"><br><br>
            Type: <input type="radio" value="human" name="player3choice" ${players[2].human}>Human
                  <input type="radio" value="computer" name="player3choice" ${players[2].computer}>Computer
                  <input type="radio" value="none" name="player3choice" ${players[2].none}>None
            <br>
    
        </th>
        <th id="player4">
            <h2>PLAYER 4</h2>
            Name: <input type="text" name="player4name" value="${players[3].name}" autocomplete="off"><br><br>
            Type: <input type="radio" value="human" name="player4choice" ${players[3].human}>Human
                  <input type="radio" value="computer" name="player4choice" ${players[3].computer}>Computer
                  <input type="radio" value="none" name="player4choice" ${players[3].none}>None
            <br>
    
        </th>
    </tr>
</table>

<!-- Set computer difficulty -->
<h1 class="center">Select Computer Difficulty</h1>
<div class="center" id="radioArea">
    Difficulty: <input type="radio" value="easy" name="computerDifficuly" ${computerDifficuly.easy}>Easy
                <input type="radio" value="medium" name="computerDifficuly" ${computerDifficuly.medium}>Medium
                <input type="radio" value="hard" name="computerDifficuly" ${computerDifficuly.hard}>Hard
            <br><br>
</div>

<!-- Grid size option -->
<h1 class="center">Select Grid Size</h1>
<div class="center">
    Columns: <input type="number" min="3" max="100" value=${gridSize.columns} id="noColumns" style="width: 50px"> <br>
    Rows: <input type="number" min="2" max="100" value=${gridSize.rows} id="noRows" style="width: 50px"><br><br>
</div>

<!-- Select Powerups -->
<h1 class="center">Select Number of Powerups</h1>
<div class="center">
    Bombs: <input type="number" min="0" max="100" value=${noPowerups["bomb"]} id="noBombs" style="width: 50px;"> <br>
    Erasers: <input type="number" min="0" max="100" value=${noPowerups["eraser"]} id="noErasers" style="width: 50px"> <br>
    Spray Cans: <input type="number" min="0" max="100" value=${noPowerups["horizontal spray"]+noPowerups["vertical spray"]} id="noSpray" style="width: 50px"> <br>
    Switch: <input type="number" min="0" max="100" value=${noPowerups["switch"]} id="noSwitch" style="width: 50px"> <br>
</div> <br><br>

<!-- Create play button -->
<button class="center" onclick="check_game_requirements()">Play!</button>
<br>

<script src="dotsAndBoxes.js"></script>
`
    return HTML
}


let CSS = `
img {
    height: 200px;
  
  }

  body {
    caret-color: transparent;
  }
  
  .center {
    display: block;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }
  
  h1 {
    font-family: "Lucida Sans", "Lucida Sans Regular", "Lucida Grande", "Lucida Sans Unicode", "Geneva", "Verdana", "sans-serif";
    font-size: x-large;
    color: #404042;
    margin-top: 0px;
  }
  
  h2 {
    text-decoration: underline;
    text-decoration-thickness: 2px;
  }
  
  th {
    font-family: "Lucida Sans", "Lucida Sans Regular", "Lucida Grande", "Lucida Sans Unicode", "Geneva", "Verdana", "sans-serif";
    width: 40%;
    padding-left: 10px;
    padding-bottom: 20px;
    text-align: left;
  }
  
  table { 
    border-spacing: 30px;
    border-collapse: separate;
    margin-left: auto;
    margin-right: auto;
  }
  
  #player1{
    background-color:#6495ed;
    border: 4px solid #3e67cf;
  }
  
  #player2{
    background-color:#ff4929;
    border: 4px solid #e32605;
  }
  
  #player3{
    background-color:#2fda3a;
    border: 4px solid #3cb371;
  }
  
  #player4{
    background-color:#ffd700;
    border: 4px solid #ffb600;
  }
  
  .profile {
    width: 50px;
    height: 50px;
  }
  
  div {
    font-family: "Lucida Sans", "Lucida Sans Regular", "Lucida Grande", "Lucida Sans Unicode", "Geneva", "Verdana", "sans-serif";
    font-size: x-large;
    color: #404042;
  }
  
  button {
    font-family: "Lucida Sans", "Lucida Sans Regular", "Lucida Grande", "Lucida Sans Unicode", "Geneva", "Verdana", "sans-serif";
    font-size: 30px;
    color: #404042;
    padding: 10px 80px 10px 80px;
  }
  
  #radioArea {
    font-size: large;
  }
`
