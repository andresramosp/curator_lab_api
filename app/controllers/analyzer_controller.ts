import type { HttpContext } from '@adonisjs/core/http'

import AnalyzerService from '#services/analyzer_service'

export default class AnalyzerController {
  public async analyze({ request, response }: HttpContext) {
    const analyzerService = new AnalyzerService()

    try {
      // Obtener los IDs de las imágenes desde el frontend
      const { photos } = request.body()
      if (!Array.isArray(photos) || photos.length === 0) {
        return response.badRequest({ message: 'No image IDs provided' })
      }

      const photosIds = photos.map((photo) => photo.id)

      const { results, cost } = await analyzerService.analyze(photosIds)

      return response.ok({
        results,
        cost,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Something went wrong', error: error.message })
    }
  }
}

// public async analyze({ request, response }: HttpContext) {
//   try {
//     // Obtener todos los archivos del formulario
//     const allFiles = request.allFiles()

//     // Filtrar archivos que comiencen con "image-"
//     const imageEntries = Object.entries(allFiles).filter(([key]) => key.startsWith('image-'))

//     // Validar que al menos haya una imagen válida
//     if (imageEntries.length === 0) {
//       return response.badRequest({ message: 'At least one valid image file is required' })
//     }

//     // Procesar las imágenes válidas
//     const validImages = []
//     for (const [key, file] of imageEntries) {
//       if (Array.isArray(file)) {
//         // Si es un array, procesa cada archivo
//         for (const singleFile of file) {
//           if (singleFile.tmpPath) {
//             const resizedBuffer = await sharp(singleFile.tmpPath)
//               .resize({ width: 512, fit: 'inside' })
//               .toBuffer()

//             validImages.push({
//               id: key.replace('image-', ''), // Extraer el ID de la clave
//               base64: resizedBuffer.toString('base64'),
//             })
//           }
//         }
//       } else if (file?.tmpPath) {
//         // Si es un solo archivo, procesa directamente
//         const resizedBuffer = await sharp(file.tmpPath)
//           .resize({ width: 512, fit: 'inside' })
//           .toBuffer()

//         validImages.push({
//           id: key.replace('image-', ''), // Extraer el ID de la clave
//           base64: resizedBuffer.toString('base64'),
//         })
//       }
//     }

//     // Crear el payload con las imágenes procesadas
//     const payload = {
//       model: 'gpt-4o',
//       messages: [
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'text',
//               text: `
//                 Return a JSON array, where each element contains information about one image. For each image, include:
//                 - 'id': id of the image, using this comma separated, ordered list: ${validImages.map((img) => img.id).join(',')}
//                 'description' (max 70 words): describe the general scene, the environment, what is doing each person and their interactions, and pay special attention to curious or strange details, funny contrasts or optical illusions, that can make this a good street photography.
//                 - 'place' (max 2 words): is it a shop? a gym? a street?
//                 - 'culture' (max 2 words): guessed country and/or culture
//                 - 'title' (max 5 words): create a suggestive title for this image
//                 - 'people' (array of subjects, like 'woman in red' or 'man with suitcase')
//               `,
//             },
//             ...validImages.map(({ base64 }) => ({
//               type: 'image_url',
//               image_url: {
//                 url: `data:image/jpeg;base64,${base64}`,
//                 detail: 'low',
//               },
//             })),
//           ],
//         },
//       ],
//       max_tokens: 2000,
//     }

//     // Enviar solicitud a OpenAI
//     const { data } = await axios.post(env.get('OPENAI_BASEURL') + '/chat/completions', payload, {
//       headers: {
//         'Authorization': `Bearer ${env.get('OPENAI_KEY')}`,
//         'Content-Type': 'application/json',
//       },
//     })

//     // Procesar la respuesta para extraer los resultados
//     const rawResult = data.choices[0].message.content
//     const cleanedResults = JSON.parse(rawResult.replace(/```json|```/g, '').trim())

//     // Calcular el costo
//     const tokensUsed = data.usage.total_tokens
//     const costInEur = tokensUsed * COST_PER_TOKEN_EUR

//     // Retornar la respuesta con los resultados
//     return response.ok({
//       results: cleanedResults,
//       cost: {
//         tokensUsed,
//         costInEur: costInEur.toFixed(6),
//       },
//     })
//   } catch (error) {
//     console.error(error)
//     return response.internalServerError({ message: 'Something went wrong', error: error.message })
//   }
// }