import { TextMessage } from '@line/bot-sdk'

import {
  setGreetingsReceivedState, getUserById, setUserNameAndUpgradeState,
  setBirthDateAndUpgradeState, resetUserState
} from './user.handler'

import { USER_STATE } from '../constants/user.constant'
import { REPLY, YES_RESPONSES, NO_RESPONSES, QUICK_REPLY_LABELS } from '../constants/messenger.constant'

import {
  isDateValid, setCurrentYear, setNextYear, hasBirthdayPassed, getDaysToNextBirthDate
} from '../utils/date.util'
import { getReplyTextObject, getQuickReplyObject } from '../utils/messenger.util'


async function receiveMessageAndReply (userId: string, text: string): Promise<TextMessage> {
  const user = await getUserById(userId)
  return getReply(userId, text, (user as any)?.state)
}

async function getReply (userId: string, text: string, state ?: string): Promise<TextMessage> {
  switch (state) {
    case USER_STATE.GREETINGS_RECEIVED: {
      return receiveUserNameAndAskBirthDate(userId, text)
    }
    case USER_STATE.NAME_RETRIEVED: {
      return receiveBirthDateAndAskQuickReply(userId, text)
    }
    case USER_STATE.BIRTH_DATE_RETRIEVED: {
      return receiveBinaryResponseAndReply(userId, text)
    }
    default: {
      return receiveGreetingsAndAskUserName(userId)
    }
  }
}

async function receiveGreetingsAndAskUserName (userId: string): Promise<TextMessage> {
  await setGreetingsReceivedState(userId)
  return getReplyTextObject(REPLY.ASK_NAME)
}

async function receiveUserNameAndAskBirthDate (userId: string, name: string): Promise<TextMessage> {
  await setUserNameAndUpgradeState(userId, name)
  return getReplyTextObject(`${name}, ${REPLY.ASK_BIRTH_DATE}`)
}

async function receiveBirthDateAndAskQuickReply (userId: string, birthDateStr: string): Promise<any> {
  if (isDateValid(birthDateStr)) {
    try {
      await setBirthDateAndUpgradeState(userId, birthDateStr)
      return getQuickReplyObject(REPLY.ASK_REMAINING_DAYS, QUICK_REPLY_LABELS)
    } catch (error) {
      return getReplyTextObject(REPLY.SAY_UNRECOGNIZED_DATE_FORMAT)
    }
  }
  return getReplyTextObject(REPLY.SAY_UNRECOGNIZED_DATE_FORMAT)
}

async function receiveBinaryResponseAndReply (userId: string, userResponse: string): Promise<TextMessage> {
  userResponse = userResponse.toLowerCase()
  
  // Reply with remaining days (user response = yes)
  if (YES_RESPONSES.includes(userResponse)) {
    await resetUserState(userId)
    const remainingDays = await getRemainingDays(userId)
    return getReplyTextObject(`There are ${remainingDays} ${REPLY.SAY_REMAINING_DAYS}`)
  }

  // Reply with goodbye (user response = no)
  if (NO_RESPONSES.includes(userResponse)) {
    await resetUserState(userId)
    return getReplyTextObject(REPLY.SAY_GOODBYE)
  }

  return getReplyTextObject(REPLY.SAY_DONT_UNDERSTAND)
}

async function getRemainingDays (userId: string) {
  const user = await getUserById(userId)

  const birthDate = (user as any).birthDate
  let nextBirthDate = setCurrentYear(birthDate)

  if (hasBirthdayPassed(nextBirthDate)) {
    nextBirthDate = setNextYear(birthDate)
  }

  return getDaysToNextBirthDate(nextBirthDate)
}

export {
  receiveMessageAndReply
}
