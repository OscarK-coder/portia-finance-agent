"use client";

import { useState, useEffect } from "react";
import {
  fetchSubscriptions,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  refundSubscription,
  Subscription,
  SubscriptionResponse,
} from "@/lib/api";

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const data: SubscriptionResponse = await fetchSubscriptions();
    setSubs(data.subs);
    setBalance(data.balance);
    setLoading(false);
  }

  async function pause(subId: string) {
    const data = await pauseSubscription(subId);
    setSubs(data.subs);
    setBalance(data.balance);
  }

  async function resume(subId: string) {
    const data = await resumeSubscription(subId);
    setSubs(data.subs);
    setBalance(data.balance);
  }

  async function cancel(subId: string) {
    const data = await cancelSubscription(subId);
    setSubs(data.subs);
    setBalance(data.balance);
  }

  async function refund(subId: string) {
    await refundSubscription(subId);
    // refunds don’t change subs, only logs
  }

  useEffect(() => {
    refresh();
  }, []);

  return { subs, balance, loading, refresh, pause, resume, cancel, refund };
}
