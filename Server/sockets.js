'use strict';

const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 8080 })
var _ = require('lodash/core');

let nodes
let lines
let headNode
let tailNode
let playerTurn
let firstClick
let gameOver

module.exports = {

    startSocketServer: function () {
        wss.on('connection', ws => {
            ws.on('message', message => {
              this.serverActions(ws,JSON.parse(message))
            })
          })
    },

    serverActions: function (ws,req){
        switch (req.msg){
            case 'INITIALIZE':
                this.sendInitializeResponse(ws,req)
                 break
            case 'NODE_CLICKED':
                 if(!gameOver)
                    this.handleNodeClick(ws,req)
                 else
                    this.sendRefreshText(ws,req)
                 break
            default:
                break
        }
    },

    // handle

    handleNodeClick: function (ws,req){

        const {x,y} = req.body

        if( (!headNode || !tailNode) && !firstClick){
            this.setfirstClick(x,y)
            this.sendValidStart(ws,req)
        }

        else if( !firstClick){
            if(this.isEndNode(x,y)){
                this.setfirstClick(x,y)
                this.sendValidStart(ws,req)
            }
            else {
                this.sendInvalidStart(ws,req)
            }    
        }

        else {
            this.handleSecondClick(ws,req)
        }
    },

    handleSecondClick: function(ws,req){
        const {x,y} = req.body
        if(this.checkValidMove(firstClick.x,firstClick.y,x,y)){
            this.sendValidEnd(ws,req)
        }
        else{
            this.sendInvalidEnd(ws,req)
        }
    },

    //utility

    anyValidMoves: function (){
        return (this.hasValidMoves(headNode.x,headNode.y) || this.hasValidMoves(tailNode.x,tailNode.y))
    },

    hasValidMoves: function (x,y){

        let results = this.openNeighbors(x,y)

        if(!!results && _.some(results,(result) => {
            return this.checkValidMove(x,y,result.x,result.y)
            })
        )
            return true 
        return false

    },

    openNeighbors: function (x,y){
        let results = []
        //check left column
        if(x > 0){
            if(y > 0){
                if(this.checkValidMove(x,y,x-1,y-1))
                    results.push({x:x-1,y:y-1})
            }
            if(y < 3){
                if(this.checkValidMove(x,y,x-1,y+1))
                    results.push({x:x-1,y:y+1})
            }
            if(this.checkValidMove(x,y,x-1,y))
                    results.push({x:x-1,y})
        }
        //check right column
        if(x < 3){
            if(y > 0){
                if(this.checkValidMove(x,y,x+1,y-1))
                    results.push({x:x+1,y:y-1})
            }
            if(y < 3){
                if(this.checkValidMove(x,y,x+1,y+1))
                    results.push({x:x+1,y:y+1})
            }
            if(this.checkValidMove(x,y,x+1,y))
                    results.push({x:x+1,y})
        }
        //check above node
        if(y > 0)
            if(this.checkValidMove(x,y,x,y-1))
                results.push({x:x,y:y-1})
        //check below node
        if(y < 3)
            if(this.checkValidMove(x,y,x,y+1))
                results.push({x:x,y:y+1})
        return results
    },

    checkValidMove: function(x1,y1,x2,y2){

        if(this.mapLookup(x2,y2)){
            if(this.nextTo(x1,y1,x2,y2)){
                if(!this.diagonalBlock(x1,y1,x2,y2)){
                    return true
                }
            }
        }
        return false
        
    },

    mapLookup: function(x,y){
        return !nodes[x + (y* 4)]
    },

    lockNode: function(x,y){
        nodes[x + (y* 4)] = 1
        return nodes[x + (y* 4)]
    },

    nextTo: function(x1,y1,x2,y2){
        if(  Math.abs(x1 - x2) < 2 && Math.abs(y1 - y2) < 2 ){
            return true
        }
        return false
    },

    diagonalBlock: function(x1,y1,x2,y2){
        //if positive -> going to right/down
        //if negative -> going  to left or up
        let point1,point2
        const xdir = (x2-x1)
        const ydir = (y2-y1)

        if(!!xdir && !!ydir){
            if(xdir == 1, ydir == 1){
                point1 = {x:x1+1,y:y1}
                point2 = {x:x1, y:y1+1}
                //right down
            }
            else if(xdir == -1, ydir == 1){
                point1 = {x:x1-1,y:y1}
                point2 = {x:x1, y:y1+1}
                //left down
            }
            else if(xdir == 1, ydir == -1){
                point1 = {x:x1+1,y:y1}
                point2 = {x:x1, y:y1-1}
                //right up
            }
            else if(xdir == -1, ydir == -1){
                point1 = {x:x1-1,y:y1}
                point2 = {x:x1, y:y1-1}
                //left up
            }

            return _.some(lines,(line) => {
                if((_.isEqual(point1,line.first) || _.isEqual(point1,line.second)) && (_.isEqual(point2,line.first) || _.isEqual(point2,line.second)))
                      return true
             })

        }
        //if either are 0 no diagonals can block
        return false
    },

    isEndNode: function(x,y){
        if(headNode.x == x && headNode.y == y){
            return true
        }
        else if( tailNode.x == x && tailNode.y == y){
            return true
        }
        return false
    },

    // Values
    resetGameState: function (){
        nodes = [0,0,0,0,
                0,0,0,0,
                0,0,0,0,
                0,0,0,0
            ]
        lines = []
        headNode = null
        tailNode = null
        playerTurn = 1
        firstClick = null
        gameOver = false
    },

    setNodeUsed: function(x,y){
        nodes[x + (y * 4)] = 1;
    },

    nextPlayer: function(){
        if(playerTurn == 1){
            playerTurn = 2
        }
        else{
            playerTurn = 1
        }
        return playerTurn
    },

    setfirstClick: function(x,y){
        firstClick = {x,y}
    },

    clearfirstClick: function(){
        firstClick = null
    },

    setHeadNode: function(x,y){
        headNode = {x,y}
    },

    setTailNode: function(x,y){
        tailNode = {x,y}
    },

    updateEndNodes: function(x,y){

        if(!headNode && !tailNode){
            this.setHeadNode(firstClick.x,firstClick.y)
            this.setTailNode(x,y)
        }

        else if (headNode.x == firstClick.x && headNode.y == firstClick.y){
            this.setHeadNode(x,y)
        }
        else if (tailNode.x == firstClick.x && tailNode.y == firstClick.y){
            this.setTailNode(x,y)
        }
        else{
            console.log('Error, this coordinate was not an end node. ',{x,y})
        }
    },
    
    addLine: function(x,y){
        lines.push({first:{x: firstClick.x,y: firstClick.y},second:{x,y}})
    },

    endGame: function(ws,req){
        gameOver = true
        this.sendGameOver(ws,req)
    },

    // RESPONSES

    sendInitializeResponse: function(ws,req){
        this.resetGameState()
        ws.send(JSON.stringify({
            id:req.id,
            msg: req.msg,
            body:{
                newLine:null,
                heading:`player${playerTurn}`,
                message:`awaiting player 1's move`
            }
         }))
    },

    sendValidStart: function (ws,req){
        ws.send(JSON.stringify({
            id:req.id,
            msg: `VALID_START_NODE`,
            body:{
                newLine:null,
                heading:`player ${playerTurn}`,
                message:`Select a second node to complete the line.`,
            }
         }))
    },

    sendInvalidStart: function (ws,req){
        ws.send(JSON.stringify({
            id:req.id,
            msg: `INVALID_START_NODE`,
            body:{
                newLine:null,
                heading:`player ${playerTurn}`,
                message:`Not a valid starting position`,
            }
         }))
    },

    sendValidEnd: function (ws,req){
        this.nextPlayer()
        this.lockNode(req.body.x,req.body.y)
        this.lockNode(firstClick.x,firstClick.y)
        this.addLine(req.body.x,req.body.y)
        this.updateEndNodes(req.body.x,req.body.y)
        if(!this.anyValidMoves())
            this.endGame(ws,req)
        else{
            ws.send(JSON.stringify({
                id:req.id,
                msg: `VALID_END_NODE`,
                body:{
                    newLine:{
                        start:{...firstClick},
                        end: {...req.body}
                    },
                    heading:`player ${playerTurn}`,
                    message: null,
                }
            }))
            this.clearfirstClick()
        }
    },

    sendInvalidEnd: function (ws,req){
        this.clearfirstClick()
        ws.send(JSON.stringify({
            id:req.id,
            msg: `INVALID_END_NODE`,
            body:{
                newLine:null,
                heading:`player ${playerTurn}`,
                message:`Invalid move!`,
            }
         }))
    },

    sendGameOver: function (ws,req){
        ws.send(JSON.stringify({
            id:req.id,
            msg: `GAME_OVER`,
            body:{
                newLine:{
                    start:{...firstClick},
                    end: {...req.body}
                },
                heading:`Game Over`,
                message:`Player ${playerTurn} wins!`,
            }
         }))
    },

    sendRefreshText: function(ws,req){
        ws.send(JSON.stringify({
            id:req.id,
            msg: `UPDATE_TEXT`,
            body:{
                newLine: null,
                heading:`Game Over`,
                message:`Please refresh to play again!`,
            }
         }))
    }

}

