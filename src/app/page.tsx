// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDebounce } from '@/lib/hooks/useDebounce'

interface Job {
  id: number
  title: string
  company: string
  apply_link: string
  created_at: string
}

interface JobsResponse {
  jobs: Job[]
  metadata: {
    latestScrapeDate: string
    totalJobs: number
    currentPage: number
    totalPages: number
  }
}

export default function Home() {
  const [jobsData, setJobsData] = useState<JobsResponse | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 500)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/jobs?search=${debouncedSearch}&page=${page}`
      )
      const data = await response.json()
      setJobsData(data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchJobs()
  }, [debouncedSearch, page])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
    setPage(1)
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-center">Jobry</h1>
          <Input
            type="search"
            placeholder="Search jobs or companies..."
            value={search}
            onChange={handleSearch}
            className="w-full max-w-xl mx-auto"
          />
          {jobsData?.metadata && (
            <div className="text-center text-sm text-gray-500">
              <p>Last Updated: {new Date(jobsData.metadata.latestScrapeDate).toLocaleString()}</p>
              <p>Found {jobsData.metadata.totalJobs} unique jobs</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center">Loading...</p>
          ) : !jobsData?.jobs.length ? (
            <p className="text-center">No jobs found</p>
          ) : (
            jobsData.jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{job.title}</h2>
                      <p className="text-sm text-gray-500">{job.company}</p>
                    </div>
                    <Button
                      onClick={() => window.open(job.apply_link, '_blank')}
                      className="ml-4"
                    >
                      Apply
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Posted: {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {jobsData?.metadata && (
          <div className="flex justify-center gap-4">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <span className="flex items-center">
              Page {page} of {jobsData.metadata.totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= jobsData.metadata.totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}