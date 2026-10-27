export function AssistantIdentity({ sourceName, testId }) {
  return (
    <div className="dk-identity" data-testid={testId}>
      <span className="dk-identity-name">DataKat</span>
      {sourceName && (
        <span className="dk-identity-source" data-testid={testId && `${testId}-source`}>
          <span className="sr-only">Source: </span>
          {sourceName}
        </span>
      )}
    </div>
  );
}
