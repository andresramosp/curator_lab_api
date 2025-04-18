// @ts-nocheck

import { withCache } from '../decorators/withCache.js'
import withCost from '../decorators/withCost.js'
import { MESSAGE_QUERY_STRUCTURE } from '../utils/prompts/query.js'
import AnalyzerService from './analyzer_service.js'
import EmbeddingsService from './embeddings_service.js'
import ModelsService from './models_service.js'

export default class QueryService {
  public modelsService: ModelsService = null
  public embeddingsService: EmbeddingsService = null
  public analyzerService: AnalyzerService = null

  constructor() {
    this.modelsService = new ModelsService()
    this.embeddingsService = new EmbeddingsService()
    this.analyzerService = new AnalyzerService()
  }

  public async structureQuery(query) {
    const numberOfWords = query.split(' ').length
    if (numberOfWords > 3) {
      return this.structureQueryLLM(query)
    } else {
      return this.structureQueryNLP(query)
    }
  }

  // withCost()
  // TODO: userid!!
  @withCache({
    key: (arg1) => `structureQuery_${arg1}`,
    provider: 'redis',
    ttl: 60 * 10,
  })
  public async structureQueryNLP(query) {
    let expansionCost = 0
    let structuredResult = await this.modelsService.getStructuredQuery(query)
    let sourceResult = { requireSource: 'description' }

    console.log(
      `[processQuery]: Result for ${query} -> ${JSON.stringify(structuredResult.positive_segments)}`
    )

    return {
      sourceResult,
      structuredResult,
      expansionCost,
    }
  }

  withCost()
  public async structureQueryLLM(query) {
    let expansionCost = 0
    let sourceResult = { requireSource: 'description' }

    const noPrefixResult = await this.modelsService.getNoPrefixQuery(query)

    const { result: modelResult, cost: modelCost } = await this.modelsService.getGPTResponse(
      MESSAGE_QUERY_STRUCTURE,
      JSON.stringify({ noPrefixResult }),
      'gpt-4o-mini'
    )

    modelResult.original = query
    modelResult.positive_segments = [...new Set([...modelResult.positive_segments])]
    modelResult.no_prefix = noPrefixResult

    // modelResult.positive_segments = [
    //   ...new Set([...modelResult.positive_segments, ...modelResult.named_entities]),
    // ]
    // modelResult.nuances_segments = [
    //   ...new Set(Object.values(modelResult.expanded_named_entities).flat()),
    // ]

    console.log(
      `[processQuery]: Result for ${query} -> ${JSON.stringify(modelResult.positive_segments)} | ${JSON.stringify(modelResult.nuances_segments)}`
    )

    return {
      sourceResult,
      structuredResult: modelResult,
      expansionCost: modelCost,
    }
  }
}
