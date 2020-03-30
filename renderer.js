class Renderer {
  constructor (world, ctx, options = {}) {
    const defaultScale = 128
    const defaultOptions = {
      scale: defaultScale,
      lineWidth: 1.5 * window.devicePixelRatio / defaultScale,
      strokeStyle: {
        dynamic: 'white',
        static: 'white',
        kinematic: 'white',
        sensor: 'rgb(255,196,0)',
        sensorDisabled: 'rgb(0,196,255)'
      },
      view: {
        x: 0,
        y: 0
      },
      grid: 5
    }
    this.options = Object.assign(defaultOptions, options)

    this.world = world
    this.ctx = ctx
    this.canvas = ctx.canvas

    this.draw = null

    this.clear = (canvas, ctx) => {
      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      )
    }
  }

  setView (xmin, xmax, ymin, ymax) {
    const { canvas, options } = this
    const xscale = canvas.width / (xmax - xmin)
    const yscale = canvas.height / (ymax - ymin)

    options.scale = Math.min(xscale, yscale)
    options.lineWidth = 1.5 * window.devicePixelRatio / options.scale
    options.view.x = (xmax + xmin) / 2
    options.view.y = (ymax + ymin) / 2
  }

  renderWorld () {
    const { ctx, canvas, options } = this
    this.clear(canvas, ctx)

    // show grid
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(options.scale, -options.scale)
    ctx.translate(-options.view.x, -options.view.y)
    ctx.lineWidth = options.lineWidth / 2
    ctx.strokeStyle = 'rgb(0,64,64)'
    const gs = options.grid
    const xmin = Math.floor((options.view.x - canvas.width / 2 / options.scale) / gs) * gs
    const xmax = Math.ceil((options.view.x + canvas.width / 2 / options.scale) / gs) * gs
    const ymin = Math.floor((options.view.y - canvas.height / 2 / options.scale) / gs) * gs
    const ymax = Math.ceil((options.view.y + canvas.height / 2 / options.scale) / gs) * gs
    for (let x = xmin; x < xmax; x += gs) {
      ctx.beginPath()
      ctx.moveTo(x, ymin)
      ctx.lineTo(x, ymax)
      ctx.stroke()
    }
    for (let y = ymin; y < ymax; y += gs) {
      ctx.beginPath()
      ctx.moveTo(xmin, y)
      ctx.lineTo(xmax, y)
      ctx.stroke()
    }
    ctx.restore()

    // show images
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(options.scale, -options.scale)
    ctx.translate(-options.view.x, -options.view.y)
    for (const [, s] of this.world.images) {
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.scale(1 / s.scale * 128 / options.scale, -1 / s.scale  *  128 / options.scale)
      ctx.drawImage(s.image, 0, 0)
      ctx.restore()
    }

    ctx.restore()

    // show bodies
    for (let body = this.world.getBodyList(); body; body = body.getNext()) {
      for (
        let fixture = body.getFixtureList();
        fixture;
        fixture = fixture.getNext()
      ) {
        if (body.render && body.render.hidden) {
          continue
        }

        if (body.render && body.render.stroke) {
          ctx.strokeStyle = body.render.stroke
        } else if (body.isDynamic()) {
          ctx.strokeStyle = options.strokeStyle.dynamic
        } else if (body.isKinematic()) {
          ctx.strokeStyle = options.strokeStyle.kinematic
        } else if (body.isStatic()) {
          ctx.strokeStyle = options.strokeStyle.static
        }

        const type = fixture.getType()
        const shape = fixture.getShape()

        ctx.save()

        if (fixture.isSensor()) {
          ctx.strokeStyle = options.strokeStyle.sensorDisabled
          if (body.getUserData()) {
            ctx.strokeStyle = options.strokeStyle.sensor
          }
        }

        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.scale(options.scale, -options.scale)
        ctx.translate(-options.view.x, -options.view.y)
        ctx.lineWidth = options.lineWidth
        if (type === 'circle') {
          this.drawCircle(body, shape)
        }
        if (type === 'edge') {
          this.drawEdge(body, shape)
        }
        if (type === 'polygon') {
          this.drawPolygon(body, shape)
        }
        if (type === 'chain') {
          this.drawChain(body, shape)
        }
        ctx.restore()

        if (body.getUserData() && body.getUserData().info) {
          ctx.save()
          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.scale(options.scale, -options.scale)
          ctx.translate(-options.view.x, -options.view.y)
          const pos = body.getPosition()
          ctx.translate(pos.x, pos.y)

          const fontSize = 48
          const lines = body.getUserData().info.split('\n')

          ctx.scale(1 / options.scale, -1 / options.scale)
          ctx.fillStyle = 'white'
          ctx.font = (fontSize * options.scale / 128).toFixed(0) + 'px Play'
          const height = fontSize * options.scale / 128 * 1.2 * lines.length
          let width = 0
          for (let i = 0; i < lines.length; ++i) {
            width = Math.max(ctx.measureText(lines[i]).width, width)
          }

          ctx.translate(-width - 20, -height - 20)

          for (let i = 0, y = 0; i < lines.length; ++i) {
            ctx.fillText(lines[i], 0, y)
            y += 48 * 1.2 * options.scale / 128
          }
          ctx.restore()
        }
      }
    }

    for (let joint = this.world.getJointList(); joint; joint = joint.getNext()) {
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.scale(options.scale, -options.scale)
      ctx.translate(-options.view.x, -options.view.y)
      ctx.lineWidth = options.lineWidth
      ctx.strokeStyle = 'red'
      this.drawJoint(joint)
      ctx.restore()
    }

    // show texts
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(options.scale, -options.scale)
    ctx.translate(-options.view.x, -options.view.y)
    for (let [, s] of this.world.texts) {
      const defaultOptions = {
        size: 48,
        color: 'white',
        font: 'Play',
        lineHeight: 48
      }
      s = Object.assign(defaultOptions, s)
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.scale(1 / options.scale, -1 / options.scale)
      ctx.fillStyle = s.color
      ctx.font = (s.size * options.scale / 128).toFixed(0) + 'px ' + s.font
      const lines = s.text.split('\n')
      for (let i = 0, y = 0; i < lines.length; ++i) {
        ctx.fillText(lines[i], 0, y)
        y += s.lineHeight * options.scale / 128
      }
      ctx.restore()
    }

    ctx.restore()
  }

  drawCircle (body, shape) {
    const ctx = this.ctx

    const radius = shape.m_radius
    const pos = body.getPosition()
    const angle = body.getAngle()

    ctx.translate(pos.x, pos.y)
    ctx.rotate(angle)

    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(radius, 0)
    ctx.stroke()

    ctx.restore()
  }

  drawEdge (body, shape) {
    const ctx = this.ctx
    const lw = this.options.lineWidth

    const v1 = shape.m_vertex1
    const v2 = shape.m_vertex2

    const dx = v2.x - v1.x
    const dy = v2.y - v1.y

    ctx.translate(v1.x, v1.y)

    ctx.beginPath()
    ctx.lineWidth = lw
    ctx.moveTo(0, 0)
    ctx.lineTo(dx, dy)
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  drawPolygon (body, shape) {
    const ctx = this.ctx

    const vertices = shape.m_vertices
    if (!vertices.length) {
      return
    }

    const pos = body.getPosition()
    const angle = body.getAngle()

    ctx.translate(pos.x, pos.y)
    ctx.rotate(angle)

    ctx.beginPath()
    for (let i = 0; i < vertices.length; ++i) {
      const v = vertices[i]
      const x = v.x
      const y = v.y
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    if (vertices.length > 2) {
      ctx.closePath()
    }

    ctx.stroke()
  }

  drawChain (body, shape) {
    const ctx = this.ctx

    const vertices = shape.m_vertices
    if (!vertices.length) {
      return
    }

    const pos = body.getPosition()
    const angle = body.getAngle()

    ctx.translate(pos.x, pos.y)
    ctx.rotate(angle)

    ctx.beginPath()
    for (let i = 0; i < vertices.length; ++i) {
      const v = vertices[i]
      const x = v.x
      const y = v.y
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }

  drawJoint (joint) {
    const ctx = this.ctx

    const a = joint.getAnchorA()
    const b = joint.getAnchorB()

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

module.exports = Renderer
