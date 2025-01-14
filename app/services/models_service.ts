import env from '#start/env'
import axios from 'axios'
import NodeCache from 'node-cache'

const cache = new NodeCache() // Simple in-memory cache

const PRICES = {
  'gpt-4o': {
    input: 2.5 / 1_000_000, // USD per input token
    output: 10.0 / 1_000_000, // USD per output token
  },
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000, // USD per input token
    output: 0.6 / 1_000_000, // USD per output token
  },
  'ft:gpt-4o-mini-2024-07-18:personal:refine:AlpaXAxW': {
    input: 0.3 / 1_000_000, // USD per input token
    output: 1.2 / 1_000_000, // USD per output token
  },
  'ft:gpt-4o-mini-2024-07-18:personal:curatorlab-term-expansor-v3-lr:AldGdmpv': {
    input: 0.3 / 1_000_000, // USD per input token
    output: 1.2 / 1_000_000, // USD per output token
  },
  'deepseek-chat': {
    input: 0.27 / 1_000_000, // USD per input token
    output: 1.1 / 1_000_000, // USD per output token
  },
}

const USD_TO_EUR = 0.92

export default class ModelsService {
  public async semanticProximity(
    text: string,
    texts: any,
    threshold: number = 0
  ): Promise<{ [key: string]: number }> {
    try {
      const isStringArray = Array.isArray(texts) && texts.every((item) => typeof item === 'string')
      const endpoint = isStringArray
        ? 'http://127.0.0.1:5000/semantic_proximity'
        : 'http://127.0.0.1:5000/semantic_proximity_obj'

      const payload = isStringArray
        ? {
            tag: text,
            tag_list: texts,
            threshold,
          }
        : {
            tag: text,
            tag_list: texts.map((item: any) => ({ id: item.id, text: item.text })),
          }

      const { data } = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      return data.similarities || {}
    } catch (error) {
      console.error('Error fetching semantic proximity:', error)
      return {}
    }
  }

  public async semanticProximitChunks(
    text1: string,
    text2: any,
    chunkSize: number = 50
  ): Promise<any[]> {
    try {
      const payload = {
        text1,
        text2,
        chunk_size: chunkSize,
      }

      const { data } = await axios.post(
        'http://127.0.0.1:5000/semantic_proximity_chunks',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      return data || []
    } catch (error) {
      console.error('Error fetching semantic proximity:', error)
      return {}
    }
  }

  public async getEmbeddings(tags: string[]): Promise<{ embeddings: number[][] }> {
    try {
      const payload = {
        tags,
      }

      const { data } = await axios.post('http://127.0.0.1:5000/get_embeddings', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      return data || {}
    } catch (error) {
      console.error('Error fetching semantic proximity:', error)
      return { embeddings: [] }
    }
  }

  public async textToTags(text: string): Promise<string[]> {
    try {
      const payload = { description: text }
      const { data } = await axios.post('http://127.0.0.1:5000/generate_tags', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      return data.generated_tags || []
    } catch (error) {
      console.error('Error fetching tags by description:', error)
      return []
    }
  }

  public async getSynonymTags(tag: string, tagList: string[]): Promise<string[]> {
    try {
      const payload = {
        tag,
        tag_list: tagList,
        proximity_threshold: 0.7,
        apply_semantic_proximity: false,
      }
      const { data } = await axios.post('http://127.0.0.1:5000/get_synonym_tags', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      return data.matches || []
    } catch (error) {
      console.error('Error fetching tags by description:', error)
      return []
    }
  }

  public async getSemanticSynonymTags(tag: string, tagList: string[]): Promise<{ matches: any[] }> {
    try {
      const payload = {
        tag,
        tag_list: tagList,
        proximity_threshold: 0.9,
      }
      const { data } = await axios.post(
        'http://127.0.0.1:5000/get_advanced_synonym_tags',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      return data.matches || []
    } catch (error) {
      // console.error('Error fetching tags:', error)
      return []
    }
  }

  public async getGPTResponse(
    systemContent: string | null,
    userContent: any,
    model:
      | 'gpt-4o'
      | 'gpt-4o-mini'
      | 'ft:gpt-4o-mini-2024-07-18:personal:refine:AlpaXAxW' = 'gpt-4o-mini',
    responseFormat: any = { type: 'json_object' }
  ): Promise<any> {
    let cacheDuration = 60 * 5
    try {
      let payload: any = {
        model,
        temperature: 0.1,
        messages: systemContent
          ? [
              {
                role: 'system',
                content: systemContent,
              },
              {
                role: 'user',
                content: userContent,
              },
            ]
          : [
              {
                role: 'user',
                content: userContent,
              },
            ],
        max_tokens: 15000,
      }

      if (responseFormat) {
        payload.response_format = responseFormat
      }

      const cacheKey = JSON.stringify({ systemContent, userContent, model })

      // Check cache
      const cachedResponse = cache.get(cacheKey)
      // if (cachedResponse) {
      //   console.log('Cache hit for getGPTResponse')
      //   return cachedResponse
      // }

      const { data } = await axios.post(`${env.get('OPENAI_BASEURL')}/chat/completions`, payload, {
        headers: {
          'Authorization': `Bearer ${env.get('OPENAI_KEY')}`,
          'Content-Type': 'application/json',
        },
      })

      const { prompt_tokens: promptTokens, completion_tokens: completionTokens } = data.usage
      const totalTokens = promptTokens + completionTokens

      const inputCost = promptTokens * PRICES[model].input * USD_TO_EUR
      const outputCost = completionTokens * PRICES[model].output * USD_TO_EUR
      const totalCostInEur = inputCost + outputCost

      const rawResult = data.choices[0].message.content
      let parsedResult

      try {
        parsedResult = JSON.parse(rawResult.replace(/```(?:json)?\s*/g, '').trim())
      } catch {
        const jsonArrayMatch = rawResult.match(/\[.*?\]/s)
        const jsonObjectMatch = rawResult.match(/\{.*?\}/s)
        if (jsonArrayMatch) {
          parsedResult = JSON.parse(jsonArrayMatch[0])
        } else if (jsonObjectMatch) {
          parsedResult = JSON.parse(jsonObjectMatch[0])
        } else {
          parsedResult = {}
        }
      }

      const result = {
        result: parsedResult.result
          ? parsedResult.result
          : parsedResult.results
            ? parsedResult.results
            : parsedResult,
        cost: {
          totalCostInEur,
          inputCost,
          outputCost,
          totalTokens,
          promptTokens,
          completionTokens,
        },
      }

      // Cache the result
      cache.set(cacheKey, result, cacheDuration)

      return result
    } catch (error) {
      console.error('Error fetching GPT response:', error)
      return {}
    }
  }

  public async getDSResponse(
    systemContent: string | null,
    userContent: any,
    model: 'deepseek-chat' = 'deepseek-chat',
    responseFormat: any = { type: 'json_object' },
    temperature: number = 0.1
  ): Promise<any> {
    let cacheDuration = 60 * 30
    try {
      let payload: any = {
        model,
        temperature,
        stream: false,
        messages: systemContent
          ? [
              {
                role: 'system',
                content: systemContent,
              },
              {
                role: 'user',
                content: userContent,
              },
            ]
          : [
              {
                role: 'user',
                content: userContent,
              },
            ],
        stream: false,
      }

      const cacheKey = JSON.stringify({ systemContent, userContent, model })

      if (responseFormat) {
        payload.response_format = responseFormat
      }

      // Check cache
      const cachedResponse = cache.get(cacheKey)
      if (cachedResponse) {
        console.log('Cache hit for getGPTResponse')
        return cachedResponse
      }

      const start = performance.now() // Marca el tiempo de inicio

      const { data } = await axios.post(
        `${env.get('DEEPSEEK_BASEURL')}/chat/completions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${env.get('DEEPSEEK_KEY')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      const { prompt_tokens: promptTokens, completion_tokens: completionTokens } = data.usage
      const totalTokens = promptTokens + completionTokens

      const inputCost = promptTokens * PRICES[model].input * USD_TO_EUR
      const outputCost = completionTokens * PRICES[model].output * USD_TO_EUR
      const totalCostInEur = inputCost + outputCost

      const rawResult = data.choices[0].message.content
      let parsedResult

      try {
        parsedResult = JSON.parse(rawResult.replace(/```(?:json)?\s*/g, '').trim())
      } catch {
        const jsonArrayMatch = rawResult.match(/\[.*?\]/s)
        const jsonObjectMatch = rawResult.match(/\{.*?\}/s)
        if (jsonArrayMatch) {
          parsedResult = JSON.parse(jsonArrayMatch[0])
        } else if (jsonObjectMatch) {
          parsedResult = JSON.parse(jsonObjectMatch[0])
        } else {
          parsedResult = {}
        }
      }

      const result = {
        result: parsedResult.result
          ? parsedResult.result
          : parsedResult.results
            ? parsedResult.results
            : parsedResult,
        cost: {
          totalCostInEur,
          inputCost,
          outputCost,
          totalTokens,
          promptTokens,
          completionTokens,
        },
      }

      // Cache the result
      cache.set(cacheKey, result, cacheDuration)

      const end = performance.now()
      const executionTime = ((end - start) / 1000).toFixed(3) // Calcula el tiempo en segundos
      console.log(
        `Execution time [getDSResponse]: ${executionTime} seconds, for ${JSON.stringify(payload).length}`
      )

      return result
    } catch (error) {
      console.error('Error fetching DS response:', error)
      return {}
    }
  }
}
