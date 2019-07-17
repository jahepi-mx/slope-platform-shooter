let cursorInstance = null;

class Cursor {
            
    constructor() {
        this.position = new Vector();
        this.isPressed = false;
    }
    
    static getInstance() {
        if (cursorInstance === null) {
            cursorInstance = new Cursor();
        }
        return cursorInstance;
    }

    update(x, y) {
        this.position.x = x;
        this.position.y = offsetY - y;
    }
};


