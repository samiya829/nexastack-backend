import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Internal server error'

  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err)
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` })
}

export function createError(message: string, statusCode = 500): AppError {
  const err = new Error(message) as AppError
  err.statusCode = statusCode
  err.isOperational = true
  return err
}
