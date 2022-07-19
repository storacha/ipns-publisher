// TODO: move this out into ipns-js
// There's also a copy of this in the w3name repo, which should also be moved out.
/** Can/should the current IPNS record be overwritten with the new (candidate) record?
*/
export function canOverwrite (current, candidate) {
  // Logic copied from https://github.com/ipfs/go-ipns/blob/a8379aa25ef287ffab7c5b89bfaad622da7e976d/ipns.go#L325

  if (current.hasV2Sig && !candidate.hasV2Sig) {
    return false
  }

  if (candidate.hasV2Sig && !current.hasV2Sig) {
    return true
  }

  if (BigInt(candidate.seqno) > BigInt(current.seqno)) {
    return true
  }

  if (BigInt(candidate.seqno) === BigInt(current.seqno)) {
    if (candidate.validity > current.validity) {
      return true
    } else if (candidate.validity === current.validity && candidate.record.length > current.record.length) {
      return true
    }
  }

  return false
}
