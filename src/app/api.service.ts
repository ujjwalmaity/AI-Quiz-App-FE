import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Participant, Session } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:4000/api';

  constructor(private http: HttpClient) { }

  createSession() {
    return this.http.post<{ sessionId: string; joinUrl: string; qrDataUrl: string; session: Session }>(
      `${this.baseUrl}/sessions`,
      {}
    );
  }

  getSession(sessionId: string): Observable<Session> {
    return this.http.get<Session>(`${this.baseUrl}/sessions/${sessionId}`);
  }

  startQuiz(sessionId: string): Observable<Session> {
    return this.http.post<Session>(`${this.baseUrl}/sessions/${sessionId}/start`, {});
  }

  nextQuestion(sessionId: string): Observable<Session> {
    return this.http.post<Session>(`${this.baseUrl}/sessions/${sessionId}/next`, {});
  }

  joinSession(sessionId: string, name: string): Observable<Participant> {
    return this.http.post<Participant>(`${this.baseUrl}/sessions/${sessionId}/participants`, { name });
  }

  submitAnswer(sessionId: string, participantId: string, selectedOptionIndex: number) {
    return this.http.post<{ isCorrect: boolean; score: number }>(
      `${this.baseUrl}/sessions/${sessionId}/participants/${participantId}/answers`,
      { selectedOptionIndex }
    );
  }

  getLeaderboard(sessionId: string) {
    return this.http.get<{ id: string; name: string; score: number; correctCount: number }[]>(
      `${this.baseUrl}/sessions/${sessionId}/leaderboard`
    );
  }

  getLeaderboardCsvUrl(sessionId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/leaderboard.csv`;
  }

  submitAllAnswers(sessionId: string, participantId: string, answers: any[]) {
    return this.http.post<{ score: number; correctCount: number }>(
        `${this.baseUrl}/sessions/${sessionId}/participants/${participantId}/submit-all`,
        { answers }
    );
  }

}
