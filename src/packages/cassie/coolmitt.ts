import mitt from 'mitt'

interface Events {
  printSet: {
    currentNumber: number
    height: number
    openSet: boolean
    pageId: string
  }
}

export default mitt<Events>()
