const { World, Edge, Chain, Vec2, Circle, Box, RevoluteJoint } = require('planck-js')

class StageFactory {
  constructor (world) {
    this.x = 0
    this.y = 0
    this.world = world
    world.t = 0
    world.texts = new Map()
    world.images = new Map()
    world.queue = []
    this.move = (dx, dy) => {
      this.x += dx
      this.y += dy
    }
    this.beginFloor = () => {
      this.floor = world.createBody()
      this.floor.setUserData({ type: 'floor' })

      this.floorVTXs = []
      this.floorVTXs.push(Vec2(this.x, this.y))
    }
    this.endFloor = () => {
      this.floor.createFixture(Chain(this.floorVTXs, false))
    }
    this.addFloor = (dx, dy) => {
      this.x += dx
      this.y += dy
      this.floorVTXs.push(Vec2(this.x, this.y))
    }
    this.getPos = () => {
      return Vec2(this.x, this.y)
    }

    this.putText = (dx, dy, text, option = {}) => {
      const defaultOptions = {
        x: this.x + dx,
        y: this.y + dy,
        text: text
      }
      option = Object.assign(defaultOptions, option)
      world.texts.set(option, option)
      return option
    }

    this.putImage = (dx, dy, image, option = {}) => {
      const defaultOptions = {
        x: this.x + dx,
        y: this.y + dy,
        image: image,
        scale: 1 / 128
      }
      option = Object.assign(defaultOptions, option)
      world.images.set(option, option)
      return option
    }

    this.robotCollidesWith = (contact, sensor) => {
      const fixtureA = contact.getFixtureA()
      const fixtureB = contact.getFixtureB()
      if (fixtureA === sensor) {
        const userData = fixtureB.getBody().getUserData()
        if (userData && userData.type === 'robot') {
          return world.robots[userData.id]
        }
      }

      if (fixtureB === sensor) {
        const userData = fixtureA.getBody().getUserData()
        if (userData && userData.type === 'robot') {
          console.log(world.robots)
          return world.robots[userData.id]
        }
      }
      return false
    }
    this.makeCheckPoint = (shape, callback = (contact, sensor) => {}) => {
      const sensorBody = world.createBody()
      sensorBody.setUserData(true)
      const sensor = sensorBody.createFixture({
        shape: shape,
        isSensor: true
      })
      world.on('begin-contact', (contact) => {
        const robot = this.robotCollidesWith(contact, sensor)
        if (robot) {
          if (sensorBody.getUserData()) {
            world.queue.push(() => {
              callback(contact, sensor, robot)
            })
            sensorBody.setUserData(false)
          }
        }
      })
    }
  }
}

exports.StageFactory = StageFactory
