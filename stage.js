const { World, Edge, Vec2, Circle, Box, RevoluteJoint } = require('planck-js')

const { StageFactory } = require('./stage-utils')

const populateWorld = (world, version, port) => {
  world.t = 0

  const SF = new StageFactory(world)

  SF.move(-10, 0) // 床生成機を10m左に動かす
  SF.beginFloor()
  SF.putText(3, 5,
    `Inverted Pendulum Simulator
version ${version} 

listening on port ${port}

ルール：
・車輪以外が地面についたらアウト
・コース上の指示に従うこと
・わからないことは先輩に聞く`)
  SF.addFloor(20, 0) // 右に20m床を追加
  SF.putText(1, 5, '基礎体力測定コーナー')
  SF.addFloor(10, 0)

  {
    SF.putText(0, 5, `その１ 10m走
    x = ${SF.x + 5}m から
    x = ${SF.x + 15}m までの
    タイムを測定`)

    let startTime
    SF.addFloor(5, 0)

    // スタート地点を作成
    const sp = SF.getPos()
    SF.makeCheckPoint(
      Edge(Vec2(SF.x, SF.y - 10), Vec2(SF.x, SF.y + 10)), // センサーとなる Fixture
      (contact, sensor) => {
        // センサーにロボットが触れると，ここが実行される．
        startTime = world.t
        SF.putText(0, 0, 'Go!\n', { x: sp.x + 0.2, y: sp.y + 2 })
      })

    SF.addFloor(10, 0)

    // ゴール地点を作成
    const gp = SF.getPos()
    SF.makeCheckPoint(
      Edge(Vec2(SF.x, SF.y - 10), Vec2(SF.x, SF.y + 10)),
      (contact, sensor, robot) => {
        const time = world.t - startTime
        SF.putText(0, 0, '記録 ' + time.toFixed(3) + 's', { x: gp.x + 0.2, y: gp.y + 2 })
        robot.achievements.log.push('10m走： ' + time.toFixed(3) + 's')
      })
  }

  SF.addFloor(10, 0)
  {
    SF.putText(0, 5, `その２ 走り幅跳び
    x = ${SF.x + 5}m からの
    跳躍距離を測定`)

    SF.addFloor(5, 0)
    const sp = SF.getPos()
    // 着地点を作成
    SF.makeCheckPoint(
      Box(20 / 2, 0.3 / 2, Vec2(SF.x + 20 / 2, SF.y - 0.3 / 2 + 0.01)),
      (contact, sensor, robot) => {
        const distance = robot.wheel.getPosition().x - sp.x
        SF.putText(0, 0, '記録 ' + distance.toFixed(3) + 'm', { x: sp.x + distance, y: sp.y - 0.7 })
        robot.achievements.log.push('走り幅跳び： ' + distance.toFixed(3) + 'm')
      })

    SF.addFloor(20, 0)
  }

  SF.addFloor(10, 0) // さらに右に10m床を追加

  SF.addFloor(10, 0)
  {
    SF.putText(0, 5, `その３ 走り高跳び
    x = ${SF.x + 5}m における
    車輪の高さを測定`)

    SF.addFloor(5, 0)
    const sp = SF.getPos()
    // 計測地点を作成
    SF.makeCheckPoint(
      Edge(Vec2(SF.x, SF.y - 10), Vec2(SF.x, SF.y + 10)),
      (contact, sensor, robot) => {
        const height = robot.wheel.getPosition().y - sp.y - robot.params.wheel.r
        SF.putText(0, 0, '記録 ' + height.toFixed(3) + 'm', { x: sp.x + 0.2, y: sp.y + height + 0.2 })
        robot.achievements.log.push('走り高跳び： ' + height.toFixed(3) + 'm')
      })
  }

  {
    let startTime
    {
      SF.addFloor(10, 0)
      SF.putText(-1, 6, 'この先は\n先輩たちが趣向をこらした\n障害物競争をお楽しみください')

      // コース上に画像を配置
      const imgNeko = new Image()
      imgNeko.src = './images/welcome_kiyoshineko.svg'
      SF.putImage(6, 6, imgNeko, { scale: 350 /* px/meter */ })

      SF.addFloor(5, 0)
      // スタート地点を作成
      const sp = SF.getPos()
      SF.makeCheckPoint(
        Edge(Vec2(SF.x, SF.y - 10), Vec2(SF.x, SF.y + 10)),
        (contact, sensor) => {
          startTime = world.t
          SF.putText(0, 0, 'Go!\n', { x: sp.x + 0.2, y: sp.y + 2 })
        })

      SF.addFloor(11, 0)

      // でこぼこ道
      for (let i = 0; i < 10; i++) {
        SF.addFloor(0.3, -0.05)
        SF.addFloor(0.3, 0.05)
      }

      // ゆるい山
      SF.addFloor(2, 0)
      SF.addFloor(2, 1)
      SF.addFloor(2, -1)

      // ジャンプ台
      SF.addFloor(5, 0)
      SF.addFloor(2, 0.2)
      SF.addFloor(2, 0.4)
      SF.addFloor(2, 0.6)

      SF.addFloor(0, -1.2)
      SF.addFloor(1, 0)

      // 下り階段
      SF.addFloor(5, 0)
      for (let i = 0; i < 10; i++) {
        SF.addFloor(0.3, 0)
        SF.addFloor(0, -0.1)
      }

      SF.addFloor(10, 0)

      // ブロックの山を作る
      const blocks = []
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
        // world.createDynamicBody でダイナミクスを持つ物体を作る
        // 引数は座標
          const block = world.createDynamicBody(Vec2(SF.x - 1 - j * 0.2, SF.y + 0.1 + 0.2 * i))
          // 物体に形状を与える．Box の引数は幅と高さ（の半分）である．半分であることに注意
          block.createFixture(Box(0.1, 0.1), {
            friction: 0.1, // 摩擦
            density: 0.1 // 密度
          })
          blocks.push(block) // あとでブロックを消す時のためにリストで持っておく
        }
      }

      SF.addFloor(5, 0)

      SF.makeCheckPoint(
        Edge(Vec2(SF.x, SF.y - 10), Vec2(SF.x, SF.y + 10)),
        (contact, sensor, robot) => {
          while (blocks.length > 0) { // ブロック全部消す
            world.destroyBody(blocks.pop())
          }
        })
    }

    {
      // 1 天井とでこぼこ道
      SF.addFloor(5, 0)
      const width = 10
      const height = 1.2
      const ceil = world.createBody(Vec2(SF.x + width / 2, SF.y + height + 10 / 2))
      ceil.createFixture(Box(width / 2, 10 / 2))

      const dx = 0.1
      for (let x = dx, y = Math.sin(0); x < width; x += dx) {
        const ny = 0.1 * Math.sin(1 * x * Math.PI * 2)
        SF.addFloor(dx, ny - y)
        y = ny
      }
      SF.addFloor(5, 0)
    }

    {
      // 2 ジャンプ台とベルトコンベア
      const height = 0.5
      const width = 9
      const speed = -10
      SF.addFloor(5, 0)

      SF.addFloor(0, -height)
      SF.endFloor()

      const platform = world.createBody(Vec2(SF.x + width / 2, SF.y - 0.2 / 2))
      const platformFixture = platform.createFixture(Box(width / 2, 0.2 / 2))
      platform.setUserData({ type: 'floor' })

      world.on('pre-solve', function (contact, oldManifold) {
        const fixtureA = contact.getFixtureA()
        const fixtureB = contact.getFixtureB()

        if (fixtureA === platformFixture) {
          contact.setTangentSpeed(speed)
        }

        if (fixtureB === platformFixture) {
          contact.setTangentSpeed(speed)
        }
      })

      SF.move(width, 0)
      SF.beginFloor()
      SF.addFloor(5, 0)
    }

    {
      // 3 時限障害物
      SF.addFloor(10, 0)
      const width = 10
      const height = 1.3
      const speed = -0.1

      const platform = world.createKinematicBody(Vec2(SF.x + width / 2, SF.y + height / 2))
      platform.createFixture(Box(width / 2, height / 2))
      platform.setUserData({ type: 'floor' })

      SF.makeCheckPoint(
        Edge(Vec2(SF.x - 5, SF.y - 10), Vec2(SF.x - 5, SF.y + 10)),
        (contact, sensor, robot) => {
          platform.setLinearVelocity(Vec2(0, speed))
        })
      SF.addFloor(5, 0)
    }

    {
      // 4 エレベーター
      SF.addFloor(5, 0)

      const width = 4
      const height = 18
      const thickness = 0.1
      const ratio = 1
      const platform = world.createKinematicBody(Vec2(SF.x + width / 2, SF.y - thickness / 2))
      const platformFixture = platform.createFixture(Box(width / 2, thickness / 2))
      platform.setUserData({ type: 'floor' })

      world.on('pre-solve', function (contact, oldManifold) {
        const fixtureA = contact.getFixtureA()
        const fixtureB = contact.getFixtureB()

        if (fixtureA === platformFixture) {
          const v = fixtureB.getBody().getLinearVelocity()
          platform.setLinearVelocity(Vec2(0, ratio * Math.abs(v.x)))
        }

        if (fixtureB === platformFixture) {
          const v = fixtureA.getBody().getLinearVelocity()
          platform.setLinearVelocity(Vec2(0, ratio * Math.abs(v.x)))
        }
      })

      SF.addFloor(0, -thickness)
      SF.addFloor(width, 0)
      SF.addFloor(0, height + thickness)

      SF.addFloor(5, 0)
    }

    {
      const fp = SF.getPos()
      SF.makeCheckPoint(
        Edge(Vec2(SF.x, SF.y - 10), Vec2(SF.x, SF.y + 10)),
        (contact, sensor, robot) => {
          const timeObj = world.t - startTime
          robot.achievements.log.push('障害物競走： ' + timeObj.toFixed(3) + 's')
          let msg = '🏁finished in ' + world.t.toFixed(2) + 's\n'
          if (robot.achievements.fall.length > 0) {
            msg += `  (fell at x = ${robot.achievements.fall[0].p.x.toFixed(2)}, y = ${robot.achievements.fall[0].p.y.toFixed(2)})` + '\n'
          }
          msg += '\n'
          robot.achievements.log.forEach(ac => {
            msg += '  ' + ac + '\n'
          })
          SF.putText(0, 0, msg, { x: fp.x + 0.2, y: fp.y + 5 })
        })
    }
  }

  SF.addFloor(5, 0)
  SF.addFloor(4, 0)

  SF.putText(0, 3,
    `この先は工事中です
    　　　　　　　　　　　　　　 ＿ 　 　　
  　　　　　　　　　　　　 /==(○)　　　|　ｻﾞｸｻﾞｸ
  ￣￣￣￣￣＼　　　　(｀･ω･)　))　ヽ
  　　　　　　　　　＼　　 /つ━ＯＥ> 　|
  　　 　　　　　　　　＼　し―Ｊ' 。oゝヾ ~
  　　　　　　　　　　　　￣￣￣￣`,
    {
      size: 40,
      font: 'ＭＳ Ｐゴシック',
      lineHeight: 40 * 1
    })

  SF.addFloor(10, 0)
  SF.endFloor()
  return world
}

module.exports = populateWorld
