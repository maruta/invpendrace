'use strict'

const { World, Vec2, Circle, Box, RevoluteJoint } = window.require('planck-js')
const Renderer = window.require('./renderer')
const populateWorld = window.require('./stage')
const express = window.require('express')
const bodyParser = window.require('body-parser')
const canvas = document.querySelector('#screen')
const ctx = canvas.getContext('2d')
function resize () {
  const realToCSSPixels = window.devicePixelRatio

  var displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels)
  var displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels)

  if (canvas.width !== displayWidth ||
        canvas.height !== displayHeight) {
    canvas.width = displayWidth
    canvas.height = displayHeight
  }
}

window.onresize = resize
resize()

const spawnRobot = (world, id, p, params = {}) => {
  const defaultParams = {
    body: {
      w: 0.6,
      h: 0.4,
      m: 3,
      FD: {
        density: 3 / (0.6 * 0.4),
        friction: 10
      }
    },
    waist: Vec2(-0.15, 0),
    upperLeg: {
      w: 0.1,
      l: 0.8,
      m: 0.01
    },
    lowerLeg: {
      w: 0.1,
      l: 0.8,
      m: 0.01
    },
    wheel: {
      r: 0.2,
      m: 1.0,
      FD: {
        density: 1 / (Math.PI * 0.2 * 0.2),
        friction: 10
      }
    },
    maxTorque: 100,
    maxPower: 300
  }

  this.params = Object.assign(defaultParams, params)
  params = this.params
  const body = world.createDynamicBody(p)
  body.createFixture(Box(params.body.w / 2, params.body.h / 2), params.body.FD)
  body.setUserData({
    type: 'robot',
    id: id,
    part: 'body'
  })
  const upperLeg = world.createDynamicBody(
    Vec2.add(Vec2.add(p, params.waist), Vec2(0, -params.upperLeg.l / 2)))
  upperLeg.setUserData({
    type: 'robot',
    id: id,
    part: 'upperLeg'
  })
  upperLeg.createFixture(Box(params.upperLeg.w / 2, params.upperLeg.l / 2), params.upperLeg.m / (params.lowerLeg.w * params.lowerLeg.l))
  const lowerLeg = world.createDynamicBody(
    Vec2.add(Vec2.add(p, params.waist), Vec2(0, -params.upperLeg.l - params.lowerLeg.l / 2)))
  lowerLeg.setUserData({
    type: 'robot',
    id: id,
    part: 'lowerLeg'
  })

  lowerLeg.createFixture(Box(params.lowerLeg.w / 2, params.lowerLeg.l / 2), params.lowerLeg.m / (params.lowerLeg.w * params.lowerLeg.l))
  const joints = []
  joints[0] = world.createJoint(RevoluteJoint({
    motorSpeed: -1,
    maxMotorTorque: 1e-1,
    enableMotor: true,
    enableLimit: true,
    upperAngle: Math.PI / 2,
    lowerAngle: -Math.PI / 2
  }, body, upperLeg, Vec2.add(p, params.waist), Vec2(0, params.upperLeg.l / 2)))
  joints[1] = world.createJoint(RevoluteJoint({
    motorSpeed: 1,
    maxMotorTorque: 1e-1,
    enableMotor: true,
    enableLimit: true,
    upperAngle: Math.PI,
    lowerAngle: 0
  }, upperLeg, lowerLeg, Vec2.add(Vec2.add(p, params.waist), Vec2(0, -params.upperLeg.l)), Vec2(0, params.lowerLeg.l / 2)))

  const pWheel = Vec2(p.x + params.waist.x, p.y + params.waist.y - params.upperLeg.l - params.lowerLeg.l)
  const wheel = world.createDynamicBody(pWheel)
  wheel.createFixture(Circle(params.wheel.r), params.wheel.FD)
  wheel.setUserData({
    type: 'robot',
    id: id,
    part: 'wheel'
  })

  joints[2] = world.createJoint(RevoluteJoint({
    motorSpeed: 0,
    maxMotorTorque: 0.0,
    enableMotor: false
  }, lowerLeg, wheel, pWheel, Vec2(0, 0)))

  const robot = {
    id: id,
    body: body,
    upperLeg: upperLeg,
    lowerLeg: lowerLeg,
    wheel: wheel,
    joints: joints,
    params: params,
    torque: [0, 0, 0],
    power: 0,
    saturationFactor: 1,
    numLandContacts: 0,
    achievements: {
      fall: [],
      log: []
    },
    memory: {
      takeoff: {
        p: null,
        t: null
      },
      peak: null
    }
  }

  world.on('begin-contact', (contact) => {
    const fixtureA = contact.getFixtureA()
    const fixtureB = contact.getFixtureB()
    const userDataA = fixtureA.getBody().getUserData()
    const userDataB = fixtureB.getBody().getUserData()

    let robotUserData, targetUserData
    if (userDataA && userDataA.type === 'robot' && userDataA.id === robot.id) {
      robotUserData = userDataA
      targetUserData = userDataB
    } else if (userDataB && userDataB.type === 'robot' && userDataB.id === robot.id) {
      robotUserData = userDataB
      targetUserData = userDataA
    } else {
      return
    }
    const bp = robot.body.getPosition()
    const wp = robot.wheel.getPosition()
    const c = Vec2((bp.x * robot.params.body.m + wp.x * robot.params.wheel.m) / (robot.params.body.m + robot.params.wheel.m),
      (bp.y * robot.params.body.m + wp.y * robot.params.wheel.m) / (robot.params.body.m + robot.params.wheel.m))
    if (targetUserData && targetUserData.type === 'floor') {
      if (robotUserData && robotUserData.part === 'wheel') { // Landed
        robot.numLandContacts++
      } else if (robotUserData && robotUserData.part === 'body') { // Fall
        robot.achievements.fall.push({ p: c })
      }
      robot.memory.peak = null
    }
  })

  world.on('end-contact', (contact) => {
    const fixtureA = contact.getFixtureA()
    const fixtureB = contact.getFixtureB()
    const userDataA = fixtureA.getBody().getUserData()
    const userDataB = fixtureB.getBody().getUserData()

    let robotUserData, targetUserData
    if (userDataA && userDataA.type === 'robot' && userDataA.id === robot.id) {
      robotUserData = userDataA
      targetUserData = userDataB
    } else if (userDataB && userDataB.type === 'robot' && userDataB.id === robot.id) {
      robotUserData = userDataB
      targetUserData = userDataA
    } else {
      return
    }
    const bp = robot.body.getPosition()
    const wp = robot.wheel.getPosition()
    const p = Vec2((bp.x * robot.params.body.m + wp.x * robot.params.wheel.m) / (robot.params.body.m + robot.params.wheel.m),
      (bp.y * robot.params.body.m + wp.y * robot.params.wheel.m) / (robot.params.body.m + robot.params.wheel.m))
    if (targetUserData && targetUserData.type === 'floor') {
      if (robotUserData && robotUserData.part === 'wheel') { // takeoff
        robot.numLandContacts--
        if (robot.numLandContacts === 0) {
          robot.memory.takeoff = { p: p, t: world.t }
        }
      }
    }
  })
  return robot
}

let world
let renderer
let latestRobot
let robots
let robotCounter
let viewpoint
let cameraMode

const app = express()
const version = require('./package.json').version
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))

const server = app.listen(8933, function () {
  console.log('Node.js is listening to PORT:' + server.address().port)
})

app.post('/api/reset/', (req, res) => {
  reset()
  res.json({})
})

app.post('/api/spawn/', (req, res) => {
  let p = Vec2(0, 2)
  if (req.body.p) {
    p = Vec2(parseFloat(req.body.p[0]), parseFloat(req.body.p[1]))
  }
  const robot = spawnRobot(world, robotCounter + '', p)
  robotCounter += 1
  robots[robot.id] = robot
  latestRobot = robot
  res.json({ id: robot.id })
})

app.post('/api/camera/', (req, res) => {
  let p = Vec2(0, 2)
  if (req.body.mode == 'auto') {
    cameraMode='auto'
  }else{
    cameraMode='manual'
    viewpoint = Vec2(parseFloat(req.body.p[0]), parseFloat(req.body.p[1]))
  }
  res.json(viewpoint)  
})


app.get('/api/screenshot/', (req, res) => {
  renderer.renderWorld()
  canvas.toBlob((data) => {
    res.type(data.type)
    data.arrayBuffer().then((buf) => {
      res.send(Buffer.from(buf))
    })
  })
})

app.get('/api/getfloor/', (req, res) => {
  res.json(world.floor)
})

app.post('/api/control/', (req, res) => {
  const robot = robots[req.body.id]
  const u = req.body.u
  const doControl = req.body.doControl
  const bp = robot.body.getPosition()
  const wp = robot.wheel.getPosition()
  // approx. center of mass
  const c = Vec2((bp.x * robot.params.body.m + wp.x * robot.params.wheel.m) / (robot.params.body.m + robot.params.wheel.m),
    (bp.y * robot.params.body.m + wp.y * robot.params.wheel.m) / (robot.params.body.m + robot.params.wheel.m))

  const state = {
    body: {
      position: robot.body.getPosition(),
      angle: robot.body.getAngle(),
      velocity: robot.body.getLinearVelocity(),
      angularVelocity: robot.body.getAngularVelocity()
    },
    wheel: {
      position: robot.wheel.getPosition(),
      angle: robot.wheel.getAngle(),
      velocity: robot.wheel.getLinearVelocity(),
      angularVelocity: robot.wheel.getAngularVelocity()
    },
    joints: [],
    c: c,
    numLandContacts: robot.numLandContacts
  }

  for (let i = 0; i < 3; i++) {
    u[i] = parseFloat(u[i])
  }

  const uF = Vec2(u[0], u[1])

  // limitters
  let saturationFactor = 1
  // torque limitter
  let maxRequestedTorque = 0
  for (let i = 0; i < 3; i++) {
    const p = robot.joints[i].getAnchorA()
    const requestedTorque = u[2] + Vec2.cross(Vec2.sub(robot.body.getPosition(), p), uF)
    state.joints[i] = {
      angle: robot.joints[i].getJointAngle(),
      angularVelocity: robot.joints[i].getJointSpeed(),
      requestedTorque: requestedTorque
    }
    maxRequestedTorque = Math.max(Math.abs(requestedTorque), maxRequestedTorque)
  }
  saturationFactor = Math.max(maxRequestedTorque / robot.params.maxTorque, saturationFactor)
  // power limitter
  let requestedPower = 0
  requestedPower += Vec2.dot(uF, robot.body.getLinearVelocity())
  requestedPower += u[2] * robot.body.getAngularVelocity()
  requestedPower += -Vec2.dot(uF, robot.wheel.getLinearVelocity())
  requestedPower += (-u[2] - (state.body.position.x - state.wheel.position.x) * u[1] + (state.body.position.y - state.wheel.position.y) * u[2]) * robot.wheel.getAngularVelocity()
  saturationFactor = Math.max(requestedPower / robot.params.maxPower, saturationFactor)

  for (let i = 0; i < 3; i++) {
    state.joints[i].torque = state.joints[i].requestedTorque / saturationFactor
    robot.torque[i] = state.joints[i].torque
  }
  robot.power = requestedPower / saturationFactor
  if (doControl) {
    for (let i = 0; i < 3; i++) {
      robot.joints[i].enableMotor(false)
    }
    for (let i = 0; i < 3; i++) {
      u[i] /= saturationFactor
    }
    robot.saturationFactor = saturationFactor
    robot.body.applyForceToCenter(Vec2(u[0], u[1]))
    robot.body.applyTorque(u[2])
    robot.wheel.applyForceToCenter(Vec2(-u[0], -u[1]))
    robot.wheel.applyTorque(-u[2] - (state.body.position.x - state.wheel.position.x) * u[1] + (state.body.position.y - state.wheel.position.y) * u[2])
  }
  res.json(state)

  const userData = robot.body.getUserData()
  if (req.body.info) {
    userData.info = req.body.info
  } else {
    userData.info = null
  }
  robot.body.setUserData(userData)

  while (world.queue.length > 0) {
    (world.queue.pop())()
  }
  world.step(1 / 60, 20, 30)
  world.t += 1 / 60
})

function reset () {
  robots = new Map()
  world = new World(Vec2(0, -9.8))
  world.robots = robots
  latestRobot = undefined
  renderer = new Renderer(world, ctx)
  robotCounter = 0
  viewpoint = Vec2(0, 0)
  cameraMode = 'auto'
  populateWorld(world, version, server.address().port)
}

reset()

function updateScreen () {
  if (latestRobot) {
    const pos = latestRobot.body.getPosition()
    if(cameraMode=='auto'){
      if (Math.abs(viewpoint.x - pos.x) > 2) {
        viewpoint.x = viewpoint.x > pos.x ? pos.x + 2 : pos.x - 2
      }
      if (Math.abs(viewpoint.y - pos.y) > 1) {
        viewpoint.y = viewpoint.y > pos.y ? pos.y + 1 : pos.y - 1
      }  
    }
    const r = latestRobot
    const b = r.body.getPosition(); const ba = r.body.getAngle()
    const w = Vec2.sub(r.wheel.getPosition(), b); const wa = r.wheel.getAngle()
    const hud = `
body: (${b.x.toFixed(2).padStart(5, ' ')}, ${b.y.toFixed(2).padStart(5, ' ')}, ${ba.toFixed(2).padStart(5, ' ')}), wheel: (${w.x.toFixed(2).padStart(5, ' ')}, ${w.y.toFixed(2).padStart(5, ' ')}, ${wa.toFixed(2).padStart(5, ' ')}), numLandContacts = ${r.numLandContacts}
torque: (${r.torque[0].toFixed(2).padStart(6, ' ')}, ${r.torque[1].toFixed(2).padStart(6, ' ')}, ${r.torque[2].toFixed(2).padStart(6, ' ')}), power: ${r.power.toFixed(2).padStart(7, ' ')}, saturation factor = ${r.saturationFactor.toFixed(2)}`
    document.getElementById('hud').textContent = hud
  }
  renderer.setView(viewpoint.x - 8, viewpoint.x + 8, viewpoint.y - 3, viewpoint.y + 6)
  renderer.renderWorld()
  window.requestAnimationFrame(updateScreen)
}
updateScreen()
