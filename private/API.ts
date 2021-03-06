import * as Signal from 'await-signal'
import * as Timeout from 'await-timeout'
import * as express from 'express'
import * as _ from 'lodash'
import Question from '../shared/Question'
import Result from '../shared/Result'
import { QUESTION_TIME, QUESTION_GRACE_TIME } from '../shared/constants'
import * as logger from './logger'

interface QuestionDefinition {
  text: string,
  answers: string[],
  correctAnswerIndex: number,
  category: string,
}

enum State {
  Waiting,
  RemoteQuestion,
  RemoteQuestionGracePeriod,
  LocalQuestion,
  FinishQuestion,
}

class API {
  public router: express.Router
  private timer: Timeout
  private stateSignal: Signal

  private questions: QuestionDefinition[]

  private state: State
  private currentQuestion: QuestionDefinition
  private currentQuestionIndex: number
  private currentQuestionStartTimestamp: number
  private currentQuestionRemoteAnswers: {
    [userid: string]: number
  }
  private currentQuestionLocalAnswer?: number

  private results: (Result | null)[]

  constructor() {
    this.router = express.Router()
    this.timer = new Timeout()
    this.stateSignal = new Signal(State.Waiting)

    this.questions = require('./questions.json')

    // tslint:disable-next-line: prefer-array-literal
    this.results = new Array(this.questions.length)

    this.setupRoutes()
  }

  private setupRoutes(): void {
    this.router.get('/remote/question', (req, res) => {
      if (this.stateSignal.state === State.RemoteQuestion) {
        res.status(200).send(this.createQuestion(this.getRemainingTime()))
      } else {
        res.status(204).send()
      }
    })

    this.router.put('/remote/question/:index/answer/:userid', (req, res) => {
      const index = parseInt(req.params.index, 10)
      if ((this.stateSignal.state === State.RemoteQuestion || this.stateSignal.state === State.RemoteQuestionGracePeriod) && index === this.currentQuestionIndex) {
        const answerCheckResult = this.checkAnswerBody(req.body)
        if (answerCheckResult) {
          res.status(answerCheckResult.status).send(answerCheckResult.msg)
          return
        }
        if (this.currentQuestionRemoteAnswers[req.params.userid] !== undefined) {
          res.status(409).send()
        }
        this.currentQuestionRemoteAnswers[req.params.userid] = req.body.answerIndex
        logger.info({ remoteAnswers: this.currentQuestionRemoteAnswers }, 'Received remote answer')
        res.status(200).send()
      } else {
        res.status(403).send()
      }
    })

    this.router.get('/local/question', (req, res) => {
      if (this.stateSignal.state === State.LocalQuestion) {
        res.status(200).send(this.createQuestion(Infinity))
      } else {
        res.status(204).send()
      }
    })

    this.router.put('/local/question/:index/answer', (req, res) => {
      const index = parseInt(req.params.index, 10)
      if (this.stateSignal.state === State.LocalQuestion && index === this.currentQuestionIndex) {
        const answerCheckResult = this.checkAnswerBody(req.body)
        if (answerCheckResult) {
          res.status(answerCheckResult.status).send(answerCheckResult.msg)
          return
        }
        this.currentQuestionLocalAnswer = req.body.answerIndex
        logger.info({ answerIndex: req.body.answerIndex }, 'Received local answer')
        this.stateSignal.state = State.FinishQuestion
        res.status(200).send()
      } else {
        res.status(403).send()
      }
    })

    this.router.get('/results', (req, res) => {
      res.send(this.results)
    })

    this.router.post('/admin/next', (req, res) => {
      if (this.stateSignal.state === State.Waiting) {
        if (this.currentQuestion) {
          this.runQuestion(this.currentQuestionIndex + 1)
        } else {
          this.runQuestion(0)
        }
      } else {
        logger.error('Ignoring next while in wrong state')
      }
      res.status(200).send()
    })

    this.router.post('/admin/jump', (req, res) => {
      this.runQuestion(req.body.questionIndex)
      res.status(200).send()
    })
  }

  private async runQuestion(index: number) {
    if (index >= this.questions.length) {
      return
    }

    this.timer.clear()
    this.resetSignal()

    logger.info(`Starting question ${index} RemoteQuestion`)
    this.stateSignal.state = State.RemoteQuestion
    this.currentQuestion = this.questions[index]
    this.currentQuestionIndex = index
    this.currentQuestionStartTimestamp = (new Date()).getTime()
    this.currentQuestionRemoteAnswers = {}
    await this.timer.set(QUESTION_TIME)

    logger.info(`Starting question ${index} RemoteQuestionGracePeriod`)
    this.stateSignal.state = State.RemoteQuestionGracePeriod
    await this.timer.set(QUESTION_GRACE_TIME)

    logger.info(`Starting question ${index} LocalQuestion`)
    this.stateSignal.state = State.LocalQuestion
    await this.stateSignal.until(State.FinishQuestion)

    logger.info(`Starting question ${index} FinishQuestion`)
    const result = this.createResult()
    this.results[this.currentQuestionIndex] = result
    this.stateSignal.state = State.Waiting

    logger.info('Finished, entering Waiting')
  }

  private createQuestion(remainingTime: number): Question {
    return {
      remainingTime,
      index: this.currentQuestionIndex,
      ..._.omit(this.currentQuestion, 'correctAnswerIndex')
    }
  }

  private checkAnswerBody(body: any): { status: number, msg?: string } {
    if (typeof body !== 'object' || body === null) {
      return {
        status: 400,
        msg: 'body must be object',
      }
    }
    if (!Number.isInteger(body.answerIndex)) {
      return {
        status: 400,
        msg: 'answerIndex must be number',
      }
    }
    if (this.currentQuestion.answers[body.answerIndex] == null) {
      return {
        status: 400,
        msg: 'answerIndex out of bounds',
      }
    }
  }

  private createResult(): Result {
    const question = this.createQuestion(null)
    const correctAnswerIndex = this.questions[this.currentQuestionIndex].correctAnswerIndex

    const totalRemoteAnswerCount = Object.keys(this.currentQuestionRemoteAnswers).length
    const remoteAnswerPercentages = []
    let remoteMaxPercentage = -Infinity
    let remoteAnswerIndex: number
    for (const answerKey of Object.keys(question.answers)) {
      const answerIndex = parseInt(answerKey, 10)
      const remoteAnswerCount = Object.values(this.currentQuestionRemoteAnswers).filter(i => i === answerIndex).length
      const remoteAnswerPercentage = totalRemoteAnswerCount === 0 ? 0 : (remoteAnswerCount / totalRemoteAnswerCount) * 100
      remoteAnswerPercentages[answerIndex] = remoteAnswerPercentage
      if (remoteAnswerPercentage > remoteMaxPercentage) {
        remoteMaxPercentage = remoteAnswerPercentage
        remoteAnswerIndex = answerIndex
      }
    }
    if (remoteAnswerPercentages.indexOf(remoteMaxPercentage) !== remoteAnswerPercentages.lastIndexOf(remoteMaxPercentage)) {
      remoteAnswerIndex = -Infinity
    }

    return {
      question, correctAnswerIndex, remoteAnswerPercentages, remoteAnswerIndex,
      localAnswerIndex: this.currentQuestionLocalAnswer,
      localCorrect: this.currentQuestionLocalAnswer === correctAnswerIndex,
      remoteCorrect: remoteAnswerIndex === correctAnswerIndex
    }
  }

  private resetSignal(): void {
    // create new signal, so anyone waiting for the old signal never gets woken
    this.stateSignal = new Signal(this.stateSignal.state)
  }

  private getRemainingTime(): number {
    const elapsedTime = ((new Date()).getTime() - this.currentQuestionStartTimestamp)
    return QUESTION_TIME - elapsedTime
  }
}

export default API
