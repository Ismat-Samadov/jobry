// src/app/api/jobs/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to safely convert BigInt to Number
function formatBigInt(value: unknown) {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return value
}

// Helper function to process database results
function processDbResult(result: any) {
  if (Array.isArray(result)) {
    return result.map(item => {
      if (typeof item === 'object' && item !== null) {
        const processed: any = {}
        for (const [key, value] of Object.entries(item)) {
          processed[key] = formatBigInt(value)
        }
        return processed
      }
      return formatBigInt(item)
    })
  }
  return result
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 10

  try {
    // Get unique jobs with latest created_at for each title-company combination
    const uniqueJobs = await prisma.$queryRaw`
      WITH RankedJobs AS (
        SELECT 
          id,
          title,
          company,
          apply_link,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(title), LOWER(company)
            ORDER BY created_at DESC
          ) as rn
        FROM jobs_jobpost
        WHERE 
          LOWER(title) LIKE ${`%${search.toLowerCase()}%`} OR 
          LOWER(company) LIKE ${`%${search.toLowerCase()}%`}
      )
      SELECT *
      FROM RankedJobs
      WHERE rn = 1
      ORDER BY created_at DESC
      LIMIT ${pageSize}
      OFFSET ${(page - 1) * pageSize}
    `

    // Get the latest scrape date
    const latestScrapeDate = await prisma.jobs_jobpost.aggregate({
      _max: {
        created_at: true
      }
    })

    // Get total count of unique jobs for pagination
    const totalUniqueJobs = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT (LOWER(title), LOWER(company)))::integer as count
      FROM jobs_jobpost
      WHERE 
        LOWER(title) LIKE ${`%${search.toLowerCase()}%`} OR 
        LOWER(company) LIKE ${`%${search.toLowerCase()}%`}
    `

    // Log the search query
    if (search) {
      await prisma.search_logs.create({
        data: {
          query: search,
          timestamp: new Date(),
        },
      })
    }

    // Process the results to handle BigInt values
    const processedJobs = processDbResult(uniqueJobs)
    const totalCount = Number(totalUniqueJobs[0].count)

    return NextResponse.json({
      jobs: processedJobs,
      metadata: {
        latestScrapeDate: latestScrapeDate._max.created_at,
        totalJobs: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}