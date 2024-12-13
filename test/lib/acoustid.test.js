import assert from 'node:assert'
import { describe, it } from 'vitest'
import { lookup, fetchreleases } from '../../lib/chromaprint/acoustid'
import fps from './fps.json'

const fingerprint = 'AQADtEqiJIkeBZ90PMGRfHCOROrxC58-bMdpnMZ1tDOuIT8SfjF-xfhQModv4S-a63g74cmOhoyCtKIDbXlQqUMYjgmuPEnxHafwJbg7VHzQNPIUXENyhLmOOk1x7sF0yzjcTEf9HnmGjykckXjz4MyLi3iQ01TQ_CjrID-OSfnR5McDXXoQMkpmHSNvvNXg_Ed93GhCEV3S49pxMdeCLNmhPfEQfjmcjTm-hYZz1Mor_AX6ZYcZZRmcI1_wHuLx4_nBTpGMTwDbHCZK6TjP4EmD5kQl5seP48fkZhSewz8ifof1CNeO58Hxpygfg-kRZopyQaUs5Gh2RuimHN8uHD3eSEf-49Jxw9lBPhCnLQ7q9EWeC9UD7ym4MUcp4cd3hInzQCORH5dwRcIf48bRDulz_LhhKTf04LqRHqEl83iIukmIJjb45fiP_mXg7Ece4j3hd8JRc3jxZMjzQH-CqjvC5BxxoeHxo5l8nOkRaxDCSJHw5jDMCvjhx0J4aEfKpD66jcVL42dRNHWQR1Bv9DoaPXiE3EfLwxXxBe7h47eOPhJ-FXm7GD-0f4HXhcg_9MHNjcjx_Kjgu7gOPcvxoFk-_BSeC_3RPAle3EUTSU_weA08cTioyoR-vNIT-McOR8xRJoZ2-CSmM8hF_Dv6KQqc9LjyDfnAM0dJfKlwFs8T4raGpo1QJdD5gZEv5D8eDbngPGAc5pAjHjmP_kOz4yvOMyPy9IHGo3mOTz9e_Iam4_3xF8c78B96H-cizD9-dOLR4JIu6H2Cy9uhwxwTPrizY7-Qo98HStpg70KewIwfQI8Oat2DH9cs6ByOsgk6Hc14nBf0Ek2dET30HwxSNsdJ4orwI97xHeIu48kRU8eNfMd16DXcRAipH0-OJqbBPMH1o5NyKQzOHH8KxxlO4UHjSLiFWBe-XdCKPFdBnUGfJGmMrszhSenQjsHDjEdzhO-Q_MdzPImCGl6XIzz6HL-gOTruHP0O80f3VLgu6IGWKuh13MiLJkfXY1cs4tqM8CpcQdeRRhmDJz38C08O90Gfaoi-HaeJhmOh4dSKH9fRzTOupcZF5fC0HEW_FFOgM0ebK0EaKVPQPcePq9PwF1eSI5YcPNEh_sKO34OUPSEc8XA35BJ-uIs2grGG-JJxBf-gZVdQPTcuxtDM4QyKncHpEF9liHqLEdc3oYWqC08o4x5OEvYRUhPyoSGP6m1wsRF-4y8ovJQCfjYeEh-0xR-OP3gOcT-eI-fR-TrKE45V4nDNo02aCiESHiUzEjwq8cHn4zou3shhjsb94j6DTg-OUkdj8Tg7aD-8qzCzHM_ywEWfDj0NSRGDNoT24z2Qi4FT7cip4-9xwzlqG3oO7fAe9MWPJzpuNEH3HGcuhD-eLYc3jXhPB86Nvjjx4kcoZckh_kOe48yO_3gIUz1e-MmF_vgRdoTzBdoRHn6U4lFwH_88-EZO6DPy48dzfBkYLriRH3yOND_eJ2DFG2EViJNyHPFT-CSu4IlWfHrQI5YeQt_RNTkyXShz7PiJ4-KFT18QNmjGQfWRDx114RJ-mBWOPvuQ7xUqldgvnDl044avQ4o-B68ePD8m_gjDHWdoHFM0acrRS8cpD7ly4nmgN0foHpTn4xRKZkHU5MbotNC1Ck2LvsV1tMuOE2Lcg8t0xXgTIQ9JoM-Ro6mDVlnyQKX4IDyaPTv-4xdqgwl--LgirYifC-1-iK8QUkmK2jH84Ec6H23kChp3CWmd4zf6PMQv_EZ_oXmM7GBN4tvR5XCXC2-D2sY1QauUowllHbEu7OnwwDseBWfRI8xx6cWvEv3hUbgzuD-0E5Vz5NkNH8e7Eb5xlhSubhLGw2OO8FfABzeX4kfhrBk-JcfhH8fxH_qDOoKeEN_RPyF8HaEnPJHxM2iWvqjSHXeULoiuTHAPfYeXC8-hM4cvH_muHD8-_GjGENeF-4hHGg8UE_5RSpGOo1VCiBfeoz_qwT9OfBEhNPKO93ihrYTJ5fiB__Bp6KOFH7vwZUR_nEXRjMHvoIcYDrcOH7nxHPthHKlP7B9k-MdUAM1Ro8dv4rCLCtLzo-dhp8JHHOKFaiQeHvEVHMyPME8UDhpJNNyH_DFeo96MJtZw1gqRldHBH60Ot8KbfOB85ONRq_hZEH6i4VOOXHGOB9qaobnwC0dFfEqiQvtyvMzRLmh88Is-HO0F8drBPDs-8dCP9-iHH-dxmGMe9FzRR4YZH9oZDs-h2Ydf4YMl5_CPj8e_wwir5EKOHnZ4-Puhk8elU3D8wc-El0X64dkR-_CzGNrKKjiJ3AGv48uLx8YVHYxfOOJSdD_ORDty5YKO3khH3aiOK0YsLil-aD7SH2dhXkbZBT96DU0kIX8qfGNwJSZ-4c6hXTAX4g8uonqGLw3eFj8hPXyRHzeFb2hyoat0PBXeJEeutugJ8US-EOeHjjpe5fiEmjqC0yq0L_jxFkyqZOgu5FJx5cUvgblBaS8qD6fx40HeoZ-JM1CWLYc1PB9u4oX64gthRQchCDRcBMOIMY9BpDAAQGgLBCFCKiEQIQwxwgRGBhgjBRDKCAQYogIohBiQBDmgABNAEKAAIgBAIAgTDhkBgGBCASoMEIhQQSgAxmjIFBVEAkaIQgoCA5wgxQDjDTKEASZEIIQJIohiAiDimAOACQQQVgQCJAAAghAAiAAACOAoUQI4CYhnVDCBAGJIaUEAMEAYyoQwBAggiEAAISWAVAqAIQFAxiAniFDICKOgYcoJAZBAARNggABKIIMAMIwRQpARAlBnhSBGAEUBMMABYQSQ0FCBAGCkAAUAAAASAowBBGAAgDAiCCIBRABBRShTgBkCjCJAOMMdIEghwQSgyiBJBAFAECMIY8waAAQATCDRCAOQKMAVMIAiQAABBAhiFGWWIQIYYEQACRwQgDDDgASGEAKIEQIDRqAwzADBgJCKEGigcA4Q46ADgglIBUCaCKQUAgRJMAxDVAmBkEEEAJA0QYIwYYhTABHnGEDIECGQEkAhY4gRwgBniVACOoAEEpAQgwwQwAinHDAGAEgIM4IJCSADAgKshAJGEEUAQ0gJApATxBAikCDiAMQYAEAgQTADDiRAiDEGEUIEAQAAQog1wAjCCBDGEFAAAk4QBQggACBDFHDAKCKMBMACIoxzgDgsADFEGQAMcYIIwwQwhhgPEBWAEOKcaIZhjBAAAgEABADMUoCBMEAAhggVCCDhSBGEMOiYUMAgYgQBihkHqAEGIAQAwBQBhgBxAAkhFSAKQOYAExQgZoAQSFADiCFGGGEAVQo5o4RTQhNh2CFCCOSeUMIkAIAQVBCClQCMCCUAAABIwxAEAgnBgPAOAAGEEJI5ihgDMgiBBFMCOCAQEowAoaAQQChDABMEGaIAgAQ5YBQARABhiFcACGggEkQhBQAASDkEKIACMEMJAYYq5IQByEhLAJHAMMIIYoBBpJgAzDApKmKEAcAAYwA'
const duration = 209

describe('acoustid []', () => {
  it('acoustid []', async () => {
    const results = await lookup({ fingerprint, duration, meta: [] })
    console.log('results', results)
  })

  it('acoustid [releaseids]', async () => {
    const results = await lookup({ fingerprint, duration, meta: ['releaseids'] })
    console.log('results', JSON.stringify(results, null, 2))
  })

  it('acoustid [releases]', async () => {
    const trackCount = 27
    const results = await lookup({ fingerprint, duration, meta: ['releases'] })
    console.log('results', JSON.stringify(results, null, 2))
    const matches = results.reduce((acc, { releases, ...rest }) => {
      const filtered = releases.filter(release => release.track_count === trackCount)
      if (filtered.length) acc.push({ ...rest, releases: filtered })
      return acc
    }, [])

    console.log('matches', JSON.stringify(matches, null, 2))
  })

  it('machting releases', async () => {
    const results = await fetchreleases(fps[1], 27)
    console.log('results', JSON.stringify(results, null, 2))
  })
})
