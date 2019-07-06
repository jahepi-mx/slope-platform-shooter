class Player extends Entity {
    
    constructor(width, height, x, y, map) {
        super();
        this.atlas = Atlas.getInstance();
        this.assets = Assets.getInstance(); 
        this.size.x = this.atlas.sprites["stand"].width / this.atlas.sprites["stand"].height * height;
        this.size.y = height; 
        this.map = map;
        this.position.x = x * map.tileWidth + map.tileWidth * 0.5;
        this.position.y = y * map.tileHeight + map.tileHeight * 0.5;
        this.friction.x = 0.8;
        this.friction.y = 1;
        this.camera = map.camera;
        this.jumpScalarVelocity = map.tileHeight * 0.8;
        this.walkScalarVelocity = map.tileWidth * 1.5;
        this.moves = [[0,0],[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
        this.acceleration.y = -map.tileHeight * 4;
        this.isJumping = false;
        this.left = this.right = this.up = false, this.down = false, this.jump = false;
        this.isOnMovingTile = false;
        this.movingTile = null;
        this.movingTiles = [];
        this.isOnLadder = false;
        this.targetFriction = new Vector(Math.pow(this.friction.x, 60), Math.pow(this.friction.y, 60));
        this.direction = new Vector(1, 0);
        this.runAnimation = new Animation(7, 3);
        this.cursor = Cursor.getInstance();
        this.shootTime = 0;
        this.shootTimeLimit = 0.1;
        this.gunRadiansDir = 0;
    }
    
    update(dt) {
        var newX = this.position.x - this.camera.position.x;
        var newY = this.position.y - this.camera.position.y;
        var diffVector = new Vector(this.cursor.position.x - newX, this.cursor.position.y - newY);
        this.gunRadiansDir = -Math.atan2(diffVector.y, diffVector.x) + (this.direction.x > 0 ? 0 : Math.PI);
        this.shootTime += dt;
        if (this.shootTime >= this.shootTimeLimit && this.cursor.isPressed) {
            this.map.bullets.push(new Bullet(this.position.x, this.position.y, this.map, -this.gunRadiansDir + (this.direction.x > 0 ? 0 : Math.PI)));
            this.shootTime = 0;
        }
        this.runAnimation.update(dt);
        if (this.isOnMovingTile) {
            if (this.movingTile.collide(this) && !this.isJumping) {
                this.velocity.x = this.movingTile.translation.x;
                this.velocity.y = this.movingTile.translation.y;
            } else {
                this.isOnMovingTile = false;
            }
        }  
        
        if (this.left) {
            this.direction.x = -1;
            this.velocity.x = this.isOnMovingTile ? this.velocity.x - this.walkScalarVelocity : -this.walkScalarVelocity;
        }
        
        if (this.right) {
            this.direction.x = 1;
            this.velocity.x = this.isOnMovingTile ? this.velocity.x + this.walkScalarVelocity : this.walkScalarVelocity;
        }
        
        if (this.jump && this.isOnMovingTile) {
            if (!this.isJumping) {
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                }
                this.velocity.y += this.jumpScalarVelocity * 4;
                this.isJumping = true;
            }
        }
        
        if (this.jump && !this.isOnMovingTile && this.velocity.y >= 0) {
            if (!this.isJumping) {
                this.velocity.y += this.jumpScalarVelocity * 4;
                this.isJumping = true;
                this.isOnLadder = false;
            }
        }
        
        if (this.isOnLadder) {
            var velY = this.up ? this.walkScalarVelocity * 0.6 : this.down ? -this.walkScalarVelocity * 0.6 : 0;
            this.velocity.y = velY;
        }

        var tmpVelocity = this.velocity.mulByScalar(dt);
        
        var tmpX = this.position.x;
        this.position.x += tmpVelocity.x;
        
        var currentX = parseInt(this.position.x / this.map.tileWidth);
        var currentY = parseInt(this.position.y / this.map.tileHeight);
        var collided = false;
        var slopeTile = null;
        for (let move of this.moves) {
            var newX = currentX + move[0];
            var newY = currentY + move[1];
            if (newX >= 0 && newX < this.map.mapWidth && newY >= 0 && newY < this.map.mapHeight) {
                var tile = this.map.tiles[newY * this.map.mapWidth + newX];
                if (!tile.walkable && this.collide(tile)) {   
                    if ((this.isOnLadder && tile.type === WALL_TILE) || !this.isOnLadder) {
                        collided = true;
                    }
                }
            }
        }
        
        if (collided) {
            this.position.x = tmpX;
        }

        var tmpY = this.position.y;
        
        currentX = parseInt(this.position.x / this.map.tileWidth);
        currentY = parseInt(this.position.y / this.map.tileHeight);
        collided = false;
        var collidedWall = false;
        var collidedTopLadder = null;
        var isOnLadderTmp = false;
        
        var hitFloor = false;
        var precision = 10;
        var step = tmpVelocity.y / precision; 
        var collidedMovingTile = false;
        var tmpPosY = 0;
        slopeTile = null;
        // This precision steps are for detecing collision on low framerate instances.
        for (var a = 0; a < precision; a++) {            
            this.position.y += step;
            if (!this.isOnMovingTile) {
                for (let movingTile of this.movingTiles) {
                    if (movingTile.collideFromFalling(this)) {
                        if (!collidedMovingTile) {
                            collidedMovingTile = true;
                            tmpPosY = this.position.y;
                            this.movingTile = movingTile;
                        }
                    }
                }
            }
            
            for (let move of this.moves) {
                var newX = currentX + move[0];
                var newY = currentY + move[1];
                if (newX >= 0 && newX < this.map.mapWidth && newY >= 0 && newY < this.map.mapHeight) {
                    var tile = this.map.tiles[newY * this.map.mapWidth + newX];
                    if (!tile.walkable && this.collide(tile)) {
                        if ((this.isOnLadder && tile.type === WALL_TILE) || !this.isOnLadder) {
                            collided = true;
                        }
                        this.velocity.y = 0;
                        // If the player hits the floor and not the ceiling
                        if (this.position.y - tmpY < 0) {
                            this.isJumping = false;
                            hitFloor = true;
                        }
                        if (tile.type === WALL_TILE) {
                            collidedWall = true;
                        }
                        if (tile.type === TOP_LADDER_TILE) {
                            collidedTopLadder = tile;
                        }
                    }
                    
                    if (tile.type === SLOPE_TILE && tile.collide(this) && !this.isJumping && this.velocity.y >= 0) {
                        slopeTile = tile;
                        this.velocity.y = 0;
                        hitFloor = true;
                    }
                    
                    if (tile.type === SLOPE_TILE && tile.collide(this) && this.velocity.y < 0) {
                        var thisBottom = this.position.y;
                        var correctBottom = tile.getNewY(this);
                        if (thisBottom < correctBottom) {
                            slopeTile = tile;
                            this.velocity.y = 0;
                            this.isJumping = false;
                        }
                    }
                    if (!this.isOnMovingTile) {
                        if (tile.type === CEILING_TILE && tile.collideFromFalling(this)) {
                            if (!collidedMovingTile) {
                                collidedMovingTile = true;
                                tmpPosY = this.position.y;
                                this.movingTile = tile;
                            }
                        }
                    }
                    
                    if (tile.type === LADDER_TILE && !this.isJumping && this.collide(tile)) {
                        if (this.isOnLadder || (this.up && this.velocity.y >= 0)) {
                            isOnLadderTmp = true;
                        }
                    }
                }
            }
        }
        this.isOnLadder = isOnLadderTmp;
        if (!collidedWall && collidedTopLadder !== null && (this.up || this.down || this.left || this.right)) {
            this.isOnLadder = false;
            var prevYPos = this.position.y;
            this.position.y = tmpY;
            var diffLadder = this.position.y - collidedTopLadder.position.y;
            if (diffLadder >= 0 && this.down || diffLadder < 0 && this.up || collidedTopLadder.collide(this)) {
                collided = false;
                this.isOnLadder = true;
            }
            this.position.y = prevYPos;
        }
        
        if (!collided && collidedMovingTile) {
            this.isOnMovingTile = true;
            this.isJumping = false;
            this.position.y = tmpPosY;
        }
        
        if (collided && slopeTile === null) {
            this.position.y = tmpY;
        }
        
        if (slopeTile !== null) {
            this.position.y = slopeTile.getNewY(this);
        }
        
        if (this.isOnLadder) {
            hitFloor = true;
        }
        
        if (!hitFloor) {
            this.velocity.addThis(this.acceleration.mulByScalar(dt));
        }
        var fps = 1 / dt;
        this.friction.x = Math.pow(this.targetFriction.x, 1 / fps);
        this.friction.y = Math.pow(this.targetFriction.y, 1 / fps);
        this.velocity.mulThis(this.friction);
    }
    
    render(context) {
        var newX = this.position.x - this.camera.position.x;
        var newY = this.position.y - this.camera.position.y;
        var tmpX = newX, tmpY = newY;
        newX -= this.size.x * 0.5;
        newY += this.size.y * 0.5;
        var image = this.direction.x > 0 ? "stand" : "stand_left";
        var gunImage = this.direction.x > 0 ? "gun" : "gun_left";
        if ((this.left || this.right) && !this.isJumping && !this.isOnLadder) {
             image = "run_" + (this.direction.x > 0 ? "" : "left_") + (this.runAnimation.getFrame() + 1);
        }
        context.drawImage(this.assets.spritesAtlas, this.atlas.sprites[image].x, this.atlas.sprites[image].y, this.atlas.sprites[image].width, this.atlas.sprites[image].height, newX, offsetY - newY, this.size.x, this.size.y);
        context.save();
        context.translate(tmpX, offsetY - tmpY);
        context.rotate(this.gunRadiansDir);
        context.drawImage(this.assets.spritesAtlas, this.atlas.sprites[gunImage].x, this.atlas.sprites[gunImage].y, this.atlas.sprites[gunImage].width, this.atlas.sprites[gunImage].height, -this.size.x * 0.5, -this.size.y * 0.5, this.size.x, this.size.y);
        context.restore();
    }
    
    moveLeft(bool) {
        this.left = bool;
    }
    
    moveRight(bool) {
        this.right = bool;
    }
    
    moveUp(bool) {
        this.up = bool; 
    }
    
    moveDown(bool) {
        this.down = bool; 
    }
    
    makeJump(bool) {
        this.jump = bool;
    }   
}